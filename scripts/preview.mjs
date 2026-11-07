import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta inválida.');
const pages=new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/TESTAR.html', 'index.html'],
  ['/tutorial.html', 'live-studio/TUTORIAL.html'],
  ['/TUTORIAL.html', 'live-studio/TUTORIAL.html'],
  ['/live-studio/TESTAR.html', 'live-studio/TESTAR.html'],
  ['/live-studio/TUTORIAL.html', 'live-studio/TUTORIAL.html'],
]);
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.writeHead(405,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Método não permitido.');return;
  }
  const file=pages.get(new URL(req.url||'/','http://localhost').pathname);
  if(!file){
    res.writeHead(404,{'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({error:'Recurso indisponível na prévia local. Use o simulador.'}));return;
  }
  try{
    const content=await readFile(path.join(root,file));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{
    res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Arquivo não encontrado. Execute npm run build.');
  }
});
server.on('error',error=>{console.error(error.message);process.exitCode=1});
server.listen(port,'0.0.0.0',()=>console.log(`Live Studio — prévia: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
