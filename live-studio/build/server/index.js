import { createServer } from 'node:http';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { StudioEngine, validateConfig } from '../src/engine.js';
import { UnconfiguredAdapter } from './platform-adapter.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.LIVE_STUDIO_PORT || 8780);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error('Porta inválida.');
const data = path.resolve(process.env.LIVE_STUDIO_DATA || path.join(root, '.data'));
await mkdir(data, { recursive: true });
let engine;
try {
    engine = new StudioEngine(JSON.parse(await readFile(path.join(data, 'rules.json'), 'utf8')));
}
catch (error) {
    if (existsSync(path.join(data, 'rules.json')))
        console.warn('Arquivo de regras inválido. Original preservado; exemplos carregados.');
    engine = new StudioEngine();
}
const adapters = ['tiktok', 'youtube', 'twitch'].map(id => new UnconfiguredAdapter(id));
function json(response, status, value) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); }
function originAllowed(request) { const host = request.headers.host || ''; try {
    const url = new URL('http://' + host);
    if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname))
        return false;
    const origin = request.headers.origin;
    return !origin || origin === `http://${host}`;
}
catch {
    return false;
} }
async function body(request) { let size = 0; const parts = []; for await (const part of request) {
    size += part.length;
    if (size > 512000)
        throw Error('Arquivo muito grande; máximo 500 KB.');
    parts.push(part);
} return JSON.parse(Buffer.concat(parts).toString('utf8')); }
let saveChain = Promise.resolve();
async function save(config) { const validated = validateConfig(config); const write = async () => { await writeFile(path.join(data, 'rules.tmp'), JSON.stringify(validated, null, 2), 'utf8'); await rename(path.join(data, 'rules.tmp'), path.join(data, 'rules.json')); engine.configure(validated); }; const pending = saveChain.then(write); saveChain = pending.catch(() => { }); await pending; }
const server = createServer(async (request, response) => {
    if (!originAllowed(request)) {
        json(response, 403, { error: 'Acesso permitido apenas pelo painel local.' });
        return;
    }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    try {
        if (url.pathname === '/api/health' && request.method === 'GET') {
            json(response, 200, { app: 'live-studio', status: 'ok', platforms_connected: 0, mode: 'simulation' });
            return;
        }
        if (url.pathname === '/api/state' && request.method === 'GET') {
            json(response, 200, engine.snapshot());
            return;
        }
        if (url.pathname === '/api/platforms' && request.method === 'GET') {
            json(response, 200, adapters.map(a => ({ platform: a.platform, ...a.capabilities() })));
            return;
        }
        if (url.pathname === '/api/command' && request.method === 'POST') {
            if (!(request.headers['content-type'] || '').includes('application/json')) {
                json(response, 415, { error: 'Envie JSON.' });
                return;
            }
            const command = await body(request);
            if (!command || !['config', 'event', 'preview', 'control'].includes(command.type))
                throw Error('Comando inválido.');
            if (command.type === 'config')
                await save(command.config);
            else
                engine.command(command);
            json(response, 200, { ok: true, state: engine.snapshot() });
            return;
        }
        if (url.pathname.startsWith('/api/')) {
            json(response, 404, { error: 'Rota não disponível. Não há endpoint de plataforma real nesta versão.' });
            return;
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            json(response, 405, { error: 'Método não permitido.' });
            return;
        }
        const files = { '/': ['dist/index.html', 'text/html'], '/overlay': ['dist/index.html', 'text/html'], '/studio.js': ['dist/studio.js', 'application/javascript'], '/live-studio.css': ['dist/live-studio.css', 'text/css'], '/TESTAR.html': ['TESTAR.html', 'text/html'], '/tutorial.html': ['TUTORIAL.html', 'text/html'] };
        const item = files[url.pathname];
        if (!item) {
            json(response, 404, { error: 'Página não encontrada.' });
            return;
        }
        const content = await readFile(path.join(root, item[0]));
        response.writeHead(200, { 'Content-Type': item[1] + '; charset=utf-8', 'Cache-Control': 'no-cache' });
        response.end(request.method === 'HEAD' ? undefined : content);
    }
    catch (error) {
        if (!response.headersSent)
            json(response, 400, { error: error.message });
    }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on('upgrade', (request, socket, head) => { if (!originAllowed(request) || new URL(request.url || '/', 'http://localhost').pathname !== '/ws') {
    socket.destroy();
    return;
} wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request)); });
wss.on('connection', client => { client.on('error', () => { }); client.send(JSON.stringify(engine.snapshot())); client.on('message', () => { }); });
let last = performance.now();
const clock = setInterval(() => { const now = performance.now(); engine.tick(now - last); last = now; }, 1000 / 60);
const broadcast = setInterval(() => { if (!wss.clients.size)
    return; const payload = JSON.stringify(engine.snapshot()); for (const client of wss.clients)
    if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 256000)
        client.send(payload); }, 50);
server.on('error', error => { console.error('Não foi possível iniciar o servidor:', error.message); clearInterval(clock); clearInterval(broadcast); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => { console.log(`\nLive Studio pronto: http://127.0.0.1:${port}\nAbra o painel no navegador. Nenhuma plataforma está conectada.\nCtrl+C encerra o estúdio.\n`); });
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => { clearInterval(clock); clearInterval(broadcast); wss.clients.forEach(c => c.close()); wss.close(); server.close(() => process.exit(0)); });
