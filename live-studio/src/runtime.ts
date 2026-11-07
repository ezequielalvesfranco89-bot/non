import {StudioEngine} from './engine.js';
import {defaultConfig} from './catalog.js';
import type {Command,State,StudioConfig} from './types.js';
const KEY='live-studio-rules-v1';
export type Transport='local'|'server'|'disconnected';
export class StudioRuntime{
 private engine:StudioEngine;private socket:WebSocket|null=null;private interval:ReturnType<typeof setInterval>|null=null;private retry:ReturnType<typeof setTimeout>|null=null;private stopped=false;private attempt=0;
 private current:State;private observer:(state:State,transport:Transport)=>void=()=>{};
 mode:Transport='local';storageWarning='';
 constructor(){let cfg=defaultConfig();try{const raw=localStorage.getItem(KEY);if(raw)cfg=JSON.parse(raw)}catch{this.storageWarning='Não foi possível ler as regras salvas. Exporte uma cópia pelo painel.'}try{this.engine=new StudioEngine(cfg)}catch{this.engine=new StudioEngine();this.storageWarning='As regras locais eram inválidas. Os exemplos foram carregados.'}this.current=this.engine.snapshot()}
 read=()=>this.current;
 subscribe(fn:(state:State,mode:Transport)=>void){this.observer=fn;fn(this.current,this.mode)}
 private apply(state:State){if(this.current.session===state.session&&state.time<this.current.time)return;this.current=state;this.observer(state,this.mode)}
 async start(){
  if(location.protocol!=='file:'){
   try{const response=await fetch('/api/state',{signal:AbortSignal.timeout(1300)});if(response.ok){const state=await response.json();if(state?.config?.version===1){this.mode='server';this.apply(state);this.connect();return}}}catch{/* Standalone/dev mode remains fully functional and clearly labelled. */}
  }
  this.mode='local';let frames=0,last=performance.now();
  this.interval=setInterval(()=>{const now=performance.now();this.engine.tick(now-last);last=now;if(++frames%3===0)this.apply(this.engine.snapshot())},1000/60);
 }
 private connect(){
  if(this.stopped)return;
  this.socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
  this.socket.onopen=()=>{this.mode='server';this.attempt=0;this.observer(this.current,this.mode)};
  this.socket.onmessage=e=>{try{this.apply(JSON.parse(e.data))}catch{/* Ignore malformed transport frames, never reinterpret as an event. */}};
  this.socket.onclose=()=>{if(this.stopped)return;this.mode='disconnected';this.observer(this.current,this.mode);this.retry=setTimeout(()=>this.connect(),Math.min(15000,1000*2**this.attempt++))};
  this.socket.onerror=()=>this.socket?.close();
 }
 async send(command:Command){
  if(this.mode==='disconnected')throw Error('Servidor desconectado. Aguarde reconectar; nenhum evento foi enviado.');
  if(this.mode==='server'){
   const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Comando recusado.');this.apply(result.state);
  }else{
   this.engine.command(command);this.apply(this.engine.snapshot());
   if(command.type==='config'){try{localStorage.setItem(KEY,JSON.stringify(this.engine.getConfig()));this.storageWarning=''}catch{this.storageWarning='O navegador não permitiu salvar. Use Exportar regras para manter uma cópia.'}}
  }
 }
 close(){this.stopped=true;if(this.interval)clearInterval(this.interval);if(this.retry)clearTimeout(this.retry);this.socket?.close()}
}
