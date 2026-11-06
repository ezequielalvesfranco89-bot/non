"""Local API, serialized game commands, WebSocket snapshots and static client."""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import random
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Callable, Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .engine import Engine
from .storage import Store
from .tiktok import TikTokAdapter

logger = logging.getLogger('battle.server')
ROOT = Path(__file__).resolve().parents[2]


class Payload(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Control(Payload):
    action: Literal['start', 'pause', 'reset', 'next', 'boss', 'clear_ranking']


class Session(Payload):
    mode: Literal['test', 'live']


class Connection(Payload):
    action: Literal['connect', 'disconnect']
    username: str = Field(default='', max_length=64)


class Simulation(Payload):
    type: Literal['gift', 'follow', 'like', 'comment', 'disconnect', 'reconnect']
    user_id: str | None = Field(default=None, min_length=1, max_length=128)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    gift_id: str | None = Field(default=None, min_length=1, max_length=128)
    repeat_count: int = Field(default=1, ge=1, le=10000, strict=True)
    combo_id: str | None = Field(default=None, min_length=1, max_length=128)
    event_id: str | None = Field(default=None, min_length=1, max_length=160)
    like_count: int = Field(default=1, ge=1, le=10000, strict=True)
    text: str = Field(default='', max_length=500)


def trusted_origin(origin: str | None, host: str) -> bool:
    if not origin:
        return True  # Native local clients do not send Origin; JSON mutations required.
    try:
        parsed = urlsplit(origin)
        return parsed.scheme in ('http', 'https') and parsed.netloc == host and parsed.hostname in ('127.0.0.1', 'localhost', '::1', 'testserver')
    except ValueError:
        return False


class Runtime:
    def __init__(self, store: Store, config_path: Path | None = None):
        self.store = store
        self.engine = Engine(store)
        if config_path is not None:
            self.engine.update_settings(json.loads(config_path.read_text(encoding='utf-8')))
        self.connection: dict[str, Any] = {'status': 'disconnected', 'username': '', 'error': None, 'follow_supported': False, 'attempt': 0, 'simulated': self.engine.mode == 'test'}
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=2048)
        self.peers: set[asyncio.Queue] = set()
        self.tasks: list[asyncio.Task] = []
        self.last_json: str | None = None
        self.connection_lock = asyncio.Lock()
        self.adapter = TikTokAdapter(self.emit_live, self.adapter_status)
        self.connection['follow_supported'] = bool(self.adapter.capabilities().get('follow_supported'))
        self.closing = False

    def state(self) -> dict:
        state = self.engine.snapshot()
        state['connection'] = dict(self.connection)
        state['live_capabilities'] = self.adapter.capabilities()
        return state

    def notify(self, message: str):
        self.engine.notify(message)

    async def start(self):
        self.tasks = [asyncio.create_task(self.worker(), name='battle-event-consumer'), asyncio.create_task(self.ticker(), name='battle-clock')]

    async def stop(self):
        self.closing = True
        await self.adapter.disconnect()
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        while not self.queue.empty():
            _, future = self.queue.get_nowait()
            if not future.done():
                future.set_exception(RuntimeError('Sistema encerrando'))
            self.queue.task_done()
        self.store.close()

    async def submit(self, operation: Callable):
        if self.closing:
            raise HTTPException(503, 'Sistema encerrando')
        future = asyncio.get_running_loop().create_future()
        try:
            self.queue.put_nowait((operation, future))
        except asyncio.QueueFull:
            raise HTTPException(429, 'Fila de eventos cheia; tente novamente em instantes') from None
        return await asyncio.shield(future)

    async def worker(self):
        while True:
            operation, future = await self.queue.get()
            try:
                result = operation()
                self.publish()
                if not future.done():
                    future.set_result(result)
            except Exception as exc:
                if not future.done():
                    future.set_exception(exc)
                if isinstance(exc, ValueError):
                    logger.info('Comando recusado: %s', type(exc).__name__)
                else:
                    logger.exception('Falha ao processar comando: %s', type(exc).__name__)
            finally:
                self.queue.task_done()

    def publish(self):
        encoded = json.dumps({'type': 'state', 'data': self.state()}, ensure_ascii=False, separators=(',', ':'))
        if encoded == self.last_json:
            return
        self.last_json = encoded
        for queue in tuple(self.peers):
            if queue.full():
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(encoded)

    async def ticker(self):
        while True:
            await asyncio.sleep(.25)
            try:
                await self.submit(self.engine.tick)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception('Falha no relógio de batalha')

    async def emit_live(self, event: dict):
        try:
            await self.submit(lambda: self.engine.handle_event(event))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning('Evento LIVE recusado (%s)', type(exc).__name__)
            if not self.closing:
                await self.submit(lambda: self.notify('Um evento LIVE inválido foi recusado. Consulte o registro do servidor.'))

    async def adapter_status(self, status: dict):
        if self.closing:
            return
        def update():
            self.connection.update(status)
            self.connection['simulated'] = False
            message = f"TikTok LIVE: {status.get('status', 'desconhecido')}"
            if status.get('error'):
                message += f" — {status['error']}"
            self.notify(message)
        await self.submit(update)


def create_app(data_dir: Path | str | None = None, frontend_dir: Path | str | None = None, config_path: Path | None = None) -> FastAPI:
    storage_dir = Path(data_dir or os.environ.get('BATTLE_DATA_DIR', ROOT / '.data-v2'))
    web_dir = Path(frontend_dir or ROOT / 'frontend' / 'dist')

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        storage_dir.mkdir(parents=True, exist_ok=True)
        runtime = Runtime(Store(str(storage_dir / 'battle.sqlite3')), config_path)
        app.state.runtime = runtime
        await runtime.start()
        try:
            yield
        finally:
            await runtime.stop()

    app = FastAPI(title='TikTok Live Battle', version='2.0.0', lifespan=lifespan)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost', '127.0.0.1', '[::1]', 'testserver'])

    @app.middleware('http')
    async def local_api(request: Request, call_next):
        if request.url.path.startswith('/api/'):
            if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                if not trusted_origin(request.headers.get('origin'), request.headers.get('host', '')):
                    return JSONResponse({'detail': 'Origem não autorizada; use o painel local.'}, status_code=403)
                if 'application/json' not in request.headers.get('content-type', '').lower():
                    return JSONResponse({'detail': 'Envie JSON.'}, status_code=415)
                length = request.headers.get('content-length')
                if length and (not length.isdigit() or int(length) > 131072):
                    return JSONResponse({'detail': 'Corpo da requisição muito grande.'}, status_code=413)
                # Also cover chunked uploads without trusting Content-Length.
                body = await request.body()
                if len(body) > 131072:
                    return JSONResponse({'detail': 'Corpo da requisição muito grande.'}, status_code=413)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['Cache-Control'] = 'no-store' if request.url.path.startswith('/api/') else 'no-cache'
        return response

    @app.exception_handler(ValueError)
    async def bad_value(request: Request, exc: ValueError):
        return JSONResponse({'detail': str(exc)}, status_code=400)

    def runtime() -> Runtime:
        return app.state.runtime

    @app.get('/api/health')
    async def health():
        rt = runtime()
        return {'status': 'ok', 'app':'tiktok-live-battle', 'version': '2.0.0', 'mode': rt.engine.mode, 'queue_depth': rt.queue.qsize(), 'live_capabilities': rt.adapter.capabilities()}

    @app.get('/api/state')
    async def state():
        return await runtime().submit(runtime().state)

    @app.post('/api/control')
    async def control(body: Control):
        rt = runtime()
        await rt.submit(lambda: rt.engine.control(body.action))
        return {'ok': True, 'state': await rt.submit(rt.state)}

    @app.put('/api/settings')
    async def settings(body: dict):
        rt = runtime()
        await rt.submit(lambda: rt.engine.update_settings(body))
        return {'ok': True, 'state': await rt.submit(rt.state)}

    @app.get('/api/settings/export')
    async def export_settings():
        data = (await runtime().submit(runtime().state))['settings']
        return JSONResponse(data, headers={'Content-Disposition': 'attachment; filename="battle-settings.json"'})

    @app.post('/api/session')
    async def session(body: Session):
        rt = runtime()
        async with rt.connection_lock:
            if rt.connection['status'] in ('connecting', 'connected', 'reconnecting') and not rt.connection.get('simulated'):
                raise HTTPException(409, 'Desconecte a live antes de mudar o modo.')
            def change():
                rt.engine.set_mode(body.mode)
                rt.connection.update(status='disconnected', username='', error=None, attempt=0, simulated=body.mode == 'test')
            await rt.submit(change)
        return {'ok': True, 'state': await rt.submit(rt.state)}

    @app.post('/api/simulate')
    async def simulate(body: Simulation):
        rt = runtime()
        def process():
            if rt.engine.mode != 'test':
                raise ValueError('Simulação disponível apenas no modo de teste.')
            if body.type in ('disconnect', 'reconnect'):
                rt.connection.update(status='disconnected' if body.type == 'disconnect' else 'connected', username='Simulador', error=None, simulated=True, attempt=0)
                rt.notify('Conexão simulada interrompida.' if body.type == 'disconnect' else 'Conexão simulada restabelecida.')
                return
            demo = random.choice([('demo-ana', 'Ana'), ('demo-lucas', 'Lucas'), ('demo-lia', 'Lia'), ('demo-rafa', 'Rafa'), ('demo-joao', 'João')])
            event = {'event_id': body.event_id or str(uuid.uuid4()), 'source': 'simulation', 'type': body.type,
                     'user_id': body.user_id or demo[0], 'name': body.name or (demo[1] if body.user_id is None else body.user_id),
                     'gift_id': body.gift_id or 'demo-rose', 'repeat_count': body.repeat_count,
                     'combo_id': body.combo_id or body.event_id or str(uuid.uuid4()), 'like_count': body.like_count, 'text': body.text}
            rt.engine.handle_event(event)
        await rt.submit(process)
        return {'ok': True, 'state': await rt.submit(rt.state)}

    @app.post('/api/connection')
    async def connection(body: Connection):
        rt = runtime()
        async with rt.connection_lock:
            if body.action == 'disconnect':
                await rt.adapter.disconnect()
                await rt.adapter_status({'status': 'disconnected', 'username': '', 'error': None, 'attempt': 0})
            else:
                if rt.engine.mode != 'live':
                    raise HTTPException(409, 'Mude para o modo LIVE antes de conectar ao TikTok.')
                if rt.connection['status'] in ('connecting', 'connected', 'reconnecting'):
                    raise HTTPException(409, 'Uma conexão já está ativa ou em andamento.')
                await rt.adapter.connect(body.username)
        return {'ok': True, 'state': await rt.submit(rt.state)}

    @app.websocket('/ws')
    async def websocket(socket: WebSocket):
        if not trusted_origin(socket.headers.get('origin'), socket.headers.get('host', '')):
            await socket.close(code=1008)
            return
        await socket.accept()
        rt = runtime()
        queue: asyncio.Queue = asyncio.Queue(maxsize=2)
        initial = await rt.submit(rt.state)
        queue.put_nowait(json.dumps({'type': 'state', 'data': initial}, ensure_ascii=False))
        rt.peers.add(queue)
        async def send_states():
            while True:
                await socket.send_text(await queue.get())
        sender = asyncio.create_task(send_states())
        try:
            while True:
                await socket.receive_text()  # Read-only stream; controls use validated JSON API.
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            rt.peers.discard(queue)
            sender.cancel()
            await asyncio.gather(sender, return_exceptions=True)

    if (web_dir / 'assets').is_dir():
        app.mount('/assets', StaticFiles(directory=web_dir / 'assets'), name='assets')

    if (web_dir / 'fonts').is_dir():
        app.mount('/fonts', StaticFiles(directory=web_dir / 'fonts'), name='fonts')

    @app.get('/{path:path}', include_in_schema=False)
    async def frontend(path: str):
        if path=='tutorial.html' and (web_dir/'tutorial.html').is_file():return FileResponse(web_dir/'tutorial.html')
        if path not in ('', 'overlay'):
            raise HTTPException(404, 'Página não encontrada')
        index = web_dir / 'index.html'
        if not index.is_file():
            return JSONResponse({'detail': 'Interface ainda não compilada. Execute npm ci e npm run build na pasta frontend.'}, status_code=503)
        return FileResponse(index)

    return app
