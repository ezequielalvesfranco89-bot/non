import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {get} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
let processHandle:ChildProcess,dir:string;
const base='http://127.0.0.1:8782';
async function state(){return (await fetch(base+'/api/state')).json()}
async function command(body:unknown,headers:Record<string,string>={}){return fetch(base+'/api/command',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)})}
before(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'live-studio-test-'));processHandle=spawn(process.execPath,['build/server/index.js'],{env:{...process.env,LIVE_STUDIO_PORT:'8782',LIVE_STUDIO_DATA:dir},stdio:'pipe'});let logs='',listening=false;processHandle.stdout?.on('data',b=>{if(b.toString().includes('Live Studio pronto'))listening=true});processHandle.stderr?.on('data',b=>logs+=b);for(let i=0;i<100;i++){try{if(listening&&(await fetch(base+'/api/health')).ok)return}catch{}if(processHandle.exitCode!==null)throw Error('Servidor não iniciou: '+logs);await new Promise(r=>setTimeout(r,30))}throw Error('Tempo de inicialização excedido: '+logs)});
after(async()=>{processHandle?.kill('SIGTERM');await new Promise(r=>setTimeout(r,100));if(dir)await rm(dir,{recursive:true,force:true})});
test('API e interface local respondem',async()=>{const s=await state();assert.equal(s.config.version,1);assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/studio.js')).status,200)});
test('plataformas não fingem integração ativa',async()=>{const p=await(await fetch(base+'/api/platforms')).json();assert.equal(p.length,3);assert.ok(p.every((v:{connected:boolean;events:unknown[]})=>!v.connected&&v.events.length===0))});
test('API aplica evento, física e duplicatas uma vez',async()=>{await command({type:'control',action:'session'});const e={id:'http-1',kind:'gift',viewerId:'marina',viewer:'Marina',giftId:'studio-rose',source:'simulation'};assert.equal((await command({type:'event',event:e})).status,200);assert.equal((await command({type:'event',event:e})).status,200);await new Promise(r=>setTimeout(r,280));const s=await state();assert.equal(s.counts.gifts['studio-rose'],1);assert.ok(s.objects.some((o:{kind:string})=>o.kind==='flower'))});
test('WebSocket envia cena autoritativa e somente leitura',async()=>{const ws=new WebSocket(base.replace('http','ws')+'/ws');const first=await new Promise<string>((resolve,reject)=>{ws.once('message',m=>resolve(m.toString()));ws.once('error',reject)});assert.equal(JSON.parse(first).config.version,1);ws.close()});
test('configurações são persistidas atomicamente',async()=>{const s=await state();s.config.settings.maxObjects=22;assert.equal((await command({type:'config',config:s.config})).status,200);const saved=JSON.parse(await readFile(path.join(dir,'rules.json'),'utf8'));assert.equal(saved.settings.maxObjects,22)});
test('origem externa e host estranho são recusados',async()=>{assert.equal((await command({type:'control',action:'session'},{Origin:'https://evil.example'})).status,403);assert.equal(await new Promise<number|undefined>((resolve,reject)=>{get(base+'/api/state',{headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)}),403)});
test('rota externa inventada e caminho de arquivo não são aceitos',async()=>{assert.equal((await fetch(base+'/api/tiktok/connect')).status,404);assert.equal((await fetch(base+'/%2e%2e/package.json')).status,404)});
test('eventos reais enviados ao simulador são recusados',async()=>{const r=await command({type:'event',event:{id:'spoof',kind:'follow',viewerId:'123',viewer:'Pessoa',source:'tiktok'}});assert.equal(r.status,400)});
