"""TikTokLive 7.0.1 adapter. No total-follower polling or inferred follow events."""
from __future__ import annotations
import asyncio
import contextlib
import importlib.metadata
import logging
import os
import re
import ssl
from .models import clean_text

logger = logging.getLogger('battle.tiktok')
PINNED_VERSION = '7.0.1'

class TikTokAdapter:
    def __init__(self, emit, on_status):
        self.emit, self.on_status = emit, on_status
        self.task = None
        self.client = None
        self.username = ''
        self.stopping = False
        self.signer_http = None

    def capabilities(self):
        try:
            version = importlib.metadata.version('TikTokLive')
            from TikTokLive.events import FollowEvent
            assert FollowEvent is not None
            return dict(available=version == PINNED_VERSION, follow_supported=version == PINNED_VERSION, version=version, reason=None if version==PINNED_VERSION else 'Instale a versão fixada nos requirements.')
        except (ImportError, importlib.metadata.PackageNotFoundError):
            return dict(available=False, follow_supported=False, version=None, reason='Instale as dependências TikTokLive para conectar. O modo de teste continua disponível.')

    async def connect(self, username):
        name = username.strip().lstrip('@')
        if not re.fullmatch(r'[A-Za-z0-9_.]{1,24}',name): raise ValueError('Informe apenas o @ do perfil, com letras, números, ponto ou sublinhado.')
        caps = self.capabilities()
        if not caps['available']: raise ValueError(caps['reason'])
        if self.task and not self.task.done(): raise ValueError('Uma conexão já está em andamento.')
        self.username, self.stopping = name, False
        await self.on_status(dict(status='connecting',username=name,error=None,attempt=0,follow_supported=caps['follow_supported']))
        self.task = asyncio.create_task(self._run(),name='tiktok-live-reconnect')

    async def disconnect(self):
        self.stopping = True
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task,return_exceptions=True)
            self.task = None
        await self._close()

    async def _close(self):
        client, self.client = self.client, None
        if client:
            # close_client=True invokes upstream's synchronous loop runner; this
            # adapter shares FastAPI's running loop, so close public transports
            # separately and never cancel unrelated server tasks.
            with contextlib.suppress(Exception, asyncio.CancelledError):
                await asyncio.wait_for(client.disconnect(close_client=False),timeout=5)
            with contextlib.suppress(Exception): await client.web.close()
        if self.signer_http:
            with contextlib.suppress(Exception): await self.signer_http.aclose()
            self.signer_http = None

    def _create_client(self):
        import httpx
        from TikTokLive import TikTokLiveClient
        cafile = os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE')
        trust = ssl.create_default_context(cafile=cafile)
        proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
        client = TikTokLiveClient(unique_id=self.username,
            web_proxy=httpx.Proxy(proxy) if proxy else None,
            ws_proxy=httpx.Proxy(proxy) if proxy else None,
            web_kwargs={'httpx_kwargs':{'verify':trust,'trust_env':True,'timeout':20}},
            ws_kwargs={'ssl':trust})
        # Upstream 7.0.1 creates its signer SDK with verify_ssl=False. Replace the
        # not-yet-used HTTP transport through its documented public setter BEFORE
        # any network operation. Preserve auth/header/proxy and system CA trust.
        sdk = client.web.signer.sdk_client
        headers = dict(sdk._headers)
        if hasattr(sdk,'token'):
            headers[sdk.auth_header_name] = f'{sdk.prefix} {sdk.token}' if sdk.prefix else sdk.token
        self.signer_http = httpx.AsyncClient(base_url=sdk._base_url,headers=headers,verify=trust,trust_env=True,timeout=25,follow_redirects=False)
        sdk.set_async_httpx_client(self.signer_http)
        self._register(client)
        return client

    def _register(self, client):
        from TikTokLive.events import ConnectEvent, DisconnectEvent, LiveEndEvent, GiftEvent, FollowEvent, LikeEvent, CommentEvent
        async def connected(event):
            await self.on_status(dict(status='connected',username=self.username,error=None,attempt=0,follow_supported=True))
        async def disconnected(event):
            if not self.stopping: await self.on_status(dict(status='reconnecting',username=self.username,error='A conexão LIVE foi interrompida. Tentando novamente.',follow_supported=True))
        async def gift(event): await self._event('gift',event,client)
        async def follow(event): await self._event('follow',event,client)
        async def like(event): await self._event('like',event,client)
        async def comment(event): await self._event('comment',event,client)
        for cls, handler in [(ConnectEvent,connected),(DisconnectEvent,disconnected),(LiveEndEvent,disconnected),(GiftEvent,gift),(FollowEvent,follow),(LikeEvent,like),(CommentEvent,comment)]:
            client.add_listener(cls,handler)

    async def _event(self, kind, event, client):
        try:
            normalized = self.normalize(kind,event,getattr(client,'room_id',None))
            if normalized: await self.emit(normalized)
        except asyncio.CancelledError: raise
        except Exception:
            logger.warning('Evento %s malformado recusado, sem recompensa.',kind)

    @staticmethod
    def normalize(kind,event,room_id):
        user = getattr(event,'user',None)
        uid = getattr(user,'id',None) or getattr(user,'user_id',None) or getattr(user,'unique_id',None)
        if not uid: return None
        uid = str(uid)
        common = getattr(event,'common',None)
        msg_id = getattr(common,'msg_id',None)
        room = str(room_id or getattr(common,'room_id',None) or 'unknown')
        event_id = f'{kind}:{room}:{msg_id}' if msg_id else (f'follow:{room}:{uid}' if kind=='follow' else None)
        avatar = getattr(user,'avatar_thumb',None)
        urls = getattr(avatar,'url_list',[]) or []
        result = dict(event_id=event_id,source='tiktok',type=kind,user_id=uid,name=clean_text(str(getattr(user,'nickname',None) or getattr(user,'unique_id',None) or uid)),avatar=next((u for u in urls if str(u).startswith('https://')),None))
        if kind=='gift':
            gift = getattr(event,'gift',None)
            gift_id = getattr(event,'gift_id',None) or getattr(gift,'id',None)
            if not gift_id: return None
            group = getattr(event,'group_id',None) or getattr(event,'order_id',None)
            count = max(1,int(getattr(event,'repeat_count',1)))
            if group:
                result['combo_id']=f'{room}:{group}'
                if not event_id: result['event_id']=f'gift:{room}:{uid}:{gift_id}:{group}:{count}'
            else:
                # Without stable group identity, process only final streak payloads.
                # A msg_id is still mandatory; otherwise dropping is safer than
                # inventing an identity and applying the same reward twice.
                if bool(getattr(event,'streaking',False)): return None
                result['combo_id']=event_id
            result.update(gift_id=str(gift_id),gift_name=clean_text(str(getattr(gift,'name',None) or gift_id)),repeat_count=count)
        elif kind=='like': result['like_count']=max(1,int(getattr(event,'count',1)))  # count, never total
        elif kind=='comment': result['text']=clean_text(str(getattr(event,'comment','')),500)
        return result if result['event_id'] else None

    async def _run(self):
        attempts = 0
        try:
            while not self.stopping:
                try:
                    self.client=self._create_client()
                    heartbeat = await self.client.start(process_connect_events=False,fetch_room_info=False,fetch_gift_info=False,fetch_live_check=True)
                    await heartbeat
                    if not self.stopping: raise ConnectionError('LIVE desconectada')
                except asyncio.CancelledError: raise
                except Exception as exc:
                    attempts+=1
                    # Do not send raw exception strings/URLs into logs or UI: some
                    # libraries embed signed URLs, session cookies or auth headers.
                    name=type(exc).__name__
                    fatal = any(s in name.lower() for s in ['auth','captcha','blocked','signature','premium','permission','certificate'])
                    delay=min(60,2**min(attempts,6))
                    message=f'{name}: verifique se o perfil está em live pública e se a rede e o serviço de integração estão disponíveis.'
                    if fatal: message+=' Conexão interrompida; corrija o acesso antes de tentar novamente.'
                    else: message+=f' Nova tentativa em {delay}s.'
                    await self.on_status(dict(status='error' if fatal else 'reconnecting',username=self.username,error=message,attempt=attempts,follow_supported=True))
                    logger.warning('TikTok LIVE: %s; tentativa %d',name,attempts)
                    await self._close()
                    if fatal: return
                    await asyncio.sleep(delay)
        finally:
            await self._close()
