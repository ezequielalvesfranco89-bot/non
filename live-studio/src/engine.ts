import Matter from 'matter-js';
import {actionById,defaultConfig,step as makeStep} from './catalog.js';
import type {ActionStep,Command,Effect,InputEvent,Log,Rule,SceneObject,SoundEvent,State,StudioConfig} from './types.js';

const {Bodies,Body,Composite,Engine,Events}=Matter;
const W=1200,H=720;
const text=(value:unknown,n=120)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n).trim();
const bounded=(n:unknown,min:number,max:number)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`Valor fora do intervalo ${min}–${max}.`);return n};
const safeId=(id:string)=>{if(['__proto__','prototype','constructor','toString','hasOwnProperty'].includes(id))throw Error('Identificador reservado. Escolha outro ID.');return id};
const clone=<T>(value:T):T=>structuredClone(value);
export function validateStep(value:unknown):ActionStep{
 const a=value as ActionStep;if(!a||!actionById(a.action))throw Error('Ação desconhecida.');
 if(a.soundId&&!actionById(a.soundId))throw Error('Som desconhecido.');
 return{id:text(a.id,80)||'step',action:a.action,value:bounded(a.value,0,1000),message:text(a.message,160),delay:bounded(a.delay,0,5000),sound:a.sound===true,...(a.soundId?{soundId:a.soundId}:{})};
}
export function validateConfig(value:unknown):StudioConfig{
 const c=value as StudioConfig;if(!c||c.version!==1||!Array.isArray(c.rules)||c.rules.length>80||!Array.isArray(c.gifts)||c.gifts.length>100)throw Error('Arquivo de regras inválido.');
 const ids=new Set<string>();
 const rules=c.rules.map(r=>{
  if(!r||!['gift','follow','like','comment','goal','custom'].includes(r.trigger)||!['all','sequence','random'].includes(r.selection)||![1,2,3].includes(r.priority))throw Error('Gatilho, seleção ou prioridade inválidos.');
  const id=safeId(text(r.id,80));if(!id||ids.has(id))throw Error('Cada regra precisa de um ID único.');ids.add(id);
  if(!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>10)throw Error('Use de 1 a 10 ações por regra.');
  return{id,name:text(r.name,80)||'Minha regra',enabled:r.enabled===true,trigger:r.trigger,match:text(r.match,100),target:bounded(r.target,1,10000),priority:r.priority,selection:r.selection,steps:r.steps.map(validateStep)};
 });
 const giftIds=new Set<string>();const gifts=c.gifts.map(g=>{const id=safeId(text(g.id,100));if(!id||giftIds.has(id))throw Error('Cada presente precisa de um ID único.');giftIds.add(id);return{id,name:text(g.name,60)||id,icon:text(g.icon,8)||'🎁'}});
 const s=c.settings;if(!s)throw Error('Configurações ausentes.');
 return{version:1,rules,gifts,settings:{soundVolume:bounded(s.soundVolume,0,1),animations:s.animations===true,maxObjects:Math.round(bounded(s.maxObjects,10,100)),maxEffects:Math.round(bounded(s.maxEffects,4,64))}};
}

type Meta=Omit<SceneObject,'x'|'y'|'angle'|'vx'|'vy'> & {body?:Matter.Body};
type Job={id:number;seq:number;viewer:string;viewerId:string;label:string;priority:number;steps:ActionStep[];index:number;due:number};
type Modifier={kind:string;until:number;value:number};
export class StudioEngine{
 readonly physics=Engine.create({enableSleeping:true});
 private config:StudioConfig;
 private character!:Matter.Body;
 private platform!:Matter.Body;
 private objects=new Map<number,Meta>();
 private effects:Effect[]=[];
 private sounds:SoundEvent[]=[];
 private logs:Log[]=[];
 private jobs:Job[]=[];
 private modifiers:Modifier[]=[];
 private seen=new Set<string>();private followers=new Set<string>();private combos=new Map<string,number>();
 private cursors:Record<string,number>={};private goalHits=new Set<string>();
 private users=new Map<string,{id:string;name:string;score:number}>();
 private counts={followers:0,gifts:{} as Record<string,number>,likes:0,comments:0,custom:0,participants:0,accepted:0,duplicates:0};
 private serial=0;private seq=0;private seed:number;private lastAction=-1000;
 private hat='';private cape=false;private radius=25;private theme='day';
 private game:State['game']={status:'ready',name:'A ilha do equilíbrio',remaining:0,score:0,target:0};
 private gameEnd=0;private miniOwner='community';private nextStar=0;
 private timerEnd:number|null=null;private message:State['message']=null;
 private notice='Tudo aqui é simulado. Nenhuma plataforma está conectada.';
 session='';time=0;paused=false;executions=0;
 constructor(config=defaultConfig(),seed=Date.now()){
  this.config=validateConfig(config);this.seed=seed>>>0;
  this.session=`studio-${Date.now()}-${Math.floor(this.random()*100000)}`;
  this.resetScene();
  Events.on(this.physics,'collisionStart',(event)=>{
   for(const pair of event.pairs){
    const other=pair.bodyA===this.character?pair.bodyB:pair.bodyB===this.character?pair.bodyA:null;
    if(other&&this.objects.get(other.id)?.kind==='star'&&this.game.status==='playing'&&this.game.name==='Caça às estrelas'){
     this.remove(other.id);this.game.score++;this.fx('sparkles','✨',this.character.position.x,this.character.position.y,900);
     this.score(this.miniOwner,5);
     if(this.game.score>=this.game.target)this.finishGame(true);
    }
   }
  });
 }
 private random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296}
 private id(){return ++this.serial}
 private log(kind:string,viewer:string,message:string,source:'simulation'|'system'='simulation'){
  this.logs.unshift({id:this.id(),kind,viewer:text(viewer,70),message:text(message,200),source,time:Date.now()});this.logs=this.logs.slice(0,120);
 }
 private user(id:string,name:string){if(!this.users.has(id))this.users.set(id,{id,name:text(name,60),score:0});const existing=this.users.get(id)!;existing.name=text(name,60)||existing.name;this.counts.participants=this.users.size;return existing}
 private score(id:string,amount:number){const u=this.users.get(id)||this.user(id,id==='community'?'Comunidade':id);u.score=Math.max(0,u.score+amount)}
 configure(config:unknown){const next=validateConfig(config);const unchanged=new Set(next.rules.filter(r=>JSON.stringify(r)===JSON.stringify(this.config.rules.find(old=>old.id===r.id))).map(r=>r.id));for(const id of Object.keys(this.cursors))if(!unchanged.has(id))delete this.cursors[id];this.config=next;this.trim();this.log('config','Você','Regras salvas. A fila já recebida mantém as ações anteriores.','system')}
 getConfig(){return clone(this.config)}
 control(action:string){
  if(action==='pause'){this.paused=true;this.log('system','Você','Cena pausada; novos efeitos aguardam na fila.','system')}
  else if(action==='resume'){this.paused=false;this.log('system','Você','Cena em movimento.','system')}
  else if(action==='scene'){this.jobs=[];this.resetScene();this.log('system','Você','Cena reiniciada. Contadores da sessão preservados.','system')}
  else if(action==='session'){
   this.jobs=[];this.seen.clear();this.followers.clear();this.combos.clear();this.goalHits.clear();this.users.clear();this.cursors={};
   this.counts={followers:0,gifts:{},likes:0,comments:0,custom:0,participants:0,accepted:0,duplicates:0};this.logs=[];this.time=0;this.executions=0;
   this.session=`studio-${Date.now()}-${this.id()}`;this.resetScene();this.log('system','Você','Nova sessão de demonstração.','system');
  }else if(action==='clear_queue'){const n=this.jobs.length;this.jobs=[];this.log('system','Você',`${n} efeitos pendentes cancelados. Contadores foram preservados.`,'system')}
  else if(action==='left')this.run(makeStep('move_left'),this.user('manual','Você'));
  else if(action==='right')this.run(makeStep('move_right'),this.user('manual','Você'));
  else if(action==='jump')this.run(makeStep('jump'),this.user('manual','Você'));
  else throw Error('Controle desconhecido.');
 }
 command(command:Command){if(command.type==='event')return this.receive(command.event);if(command.type==='preview')return this.preview(command.step);if(command.type==='config')return this.configure(command.config);if(command.type==='control')return this.control(command.action);throw Error('Comando desconhecido.')}
 preview(raw:unknown){const step=validateStep(raw);if(this.jobs.length>=200)throw Error('Fila cheia. Aguarde ou limpe a fila.');this.user('preview','Você');this.jobs.push({id:this.id(),seq:++this.seq,viewer:'Você',viewerId:'preview',label:actionById(step.action)!.name,priority:2,steps:[step],index:0,due:this.time+step.delay});this.log('preview','Você',`Teste de ação: ${actionById(step.action)!.name}`)}
 receive(raw:unknown){
  const input=raw as InputEvent;if(!input||!['gift','follow','like','comment','custom'].includes(input.kind)||input.source!=='simulation')throw Error('Somente eventos simulados são aceitos neste adaptador.');
  const e:InputEvent={id:text(input.id,160),kind:input.kind,viewerId:text(input.viewerId,100),viewer:text(input.viewer,60),source:'simulation',giftId:text(input.giftId,100),comboId:text(input.comboId,120),count:input.count??1,text:text(input.text,160),custom:text(input.custom,100)};
  if(!e.id||!e.viewerId||!e.viewer)throw Error('Preencha ID do evento, ID e nome do participante.');
  if(this.seen.has(e.id)||(e.kind==='follow'&&this.followers.has(e.viewerId))){this.counts.duplicates++;this.log('duplicate',e.viewer,'Evento repetido ignorado. Sem nova recompensa.');return{duplicate:true}}
  if(this.seen.size>=50000)throw Error('Limite de identificadores da sessão atingido. Inicie outra sessão para manter a proteção contra duplicatas.');
  const count=bounded(e.count,1,100000);if(!Number.isInteger(count))throw Error('A contagem precisa ser inteira.');
  let units=1,key='';
  if(e.kind==='gift'){
   if(!e.giftId)throw Error('O presente precisa de um ID.');safeId(e.giftId);key=JSON.stringify([e.viewerId,e.giftId,e.comboId||e.id]);
   units=Math.max(0,count-(this.combos.get(key)||0));
  }
  const matched=this.config.rules.filter(r=>r.enabled&&r.trigger===e.kind&&(r.trigger==='follow'||r.trigger==='like'||(r.trigger==='gift'&&r.match===e.giftId)||(r.trigger==='comment'&&r.match.trim().toLowerCase()===e.text?.toLowerCase())||(r.trigger==='custom'&&r.match===e.custom)));
  const newGoals=e.kind==='follow'?this.config.rules.filter(r=>r.enabled&&r.trigger==='goal'&&!this.goalHits.has(r.id)&&this.counts.followers+1>=r.target):[];
  const jobs=matched.length*units+newGoals.length;
  if(this.jobs.length+jobs>200)throw Error('Fila cheia. O evento não foi contado. Aguarde os efeitos antes de reenviar.');
  this.seen.add(e.id);if(e.kind==='gift'&&units===0){this.counts.duplicates++;return{duplicate:true}}
  this.user(e.viewerId,e.viewer);this.counts.accepted++;
  if(e.kind==='gift'){this.combos.set(key,count);this.counts.gifts[e.giftId!]=(this.counts.gifts[e.giftId!]||0)+units}
  if(e.kind==='follow'){this.followers.add(e.viewerId);this.counts.followers++;this.message={text:`Bem-vindo, ${e.viewer}!`,viewer:e.viewer,until:this.time+4500}}
  if(e.kind==='like')this.counts.likes+=count;
  if(e.kind==='comment')this.counts.comments++;
  if(e.kind==='custom')this.counts.custom++;
  const gift=this.config.gifts.find(g=>g.id===e.giftId);
  this.log(e.kind,e.viewer,e.kind==='gift'?`${units} × ${gift?.name||e.giftId}`:e.kind==='follow'?'Começou a seguir.':e.kind==='comment'?e.text||'Comentou':e.kind==='like'?`${count} curtidas`:e.custom||'Evento personalizado');
  for(let i=0;i<units;i++)for(const rule of matched)this.enqueue(rule,e);
  for(const goal of newGoals){this.goalHits.add(goal.id);this.enqueue(goal,e);this.log('goal','Comunidade',`Meta alcançada: ${goal.target} seguidores!`)}
  if(!matched.length)this.log('unmapped',e.viewer,'Nenhuma regra ativa corresponde a esse evento. Configure uma no editor.');
  return{duplicate:false};
 }
 private enqueue(rule:Rule,event:InputEvent){
  let steps=rule.steps;
  if(rule.selection==='random')steps=[steps[Math.floor(this.random()*steps.length)]];
  if(rule.selection==='sequence'){const cursor=this.cursors[rule.id]||0;steps=[steps[cursor%steps.length]];this.cursors[rule.id]=cursor+1}
  steps=clone(steps).map(s=>({...s,message:s.message.replaceAll('{name}',event.viewer).replaceAll('{gift}',this.config.gifts.find(g=>g.id===event.giftId)?.name||event.giftId||'').replaceAll('{count}',String(event.count||1))}));
  this.jobs.push({id:this.id(),seq:++this.seq,viewer:event.viewer,viewerId:event.viewerId,label:rule.name,priority:rule.priority,steps,index:0,due:this.time+steps[0].delay});
 }
 private resetScene(){
  Composite.clear(this.physics.world,false);this.objects.clear();this.effects=[];this.modifiers=[];this.sounds=[];this.hat='';this.cape=false;this.radius=25;this.theme='day';this.timerEnd=null;this.paused=false;
  this.physics.gravity.y=1;
  this.platform=Bodies.rectangle(600,520,360,24,{isStatic:true,friction:.8,label:'platform'});
  this.character=Bodies.circle(600,435,25,{density:.006,restitution:.1,friction:.5,label:'character'});
  Composite.add(this.physics.world,[this.platform,this.character]);this.game={status:'ready',name:'A ilha do equilíbrio',remaining:0,score:0,target:0};
 }
 private resizePlatform(width:number){const old=this.platform.bounds.max.x-this.platform.bounds.min.x;Body.scale(this.platform,Math.max(120,Math.min(850,width))/old,1)}
 private resizeCharacter(percent:number){const target=Math.max(16,Math.min(45,25*percent/100));Body.scale(this.character,target/this.radius,target/this.radius);this.radius=target}
 private trim(){while(this.objects.size>this.config.settings.maxObjects)this.remove(this.objects.keys().next().value!);while(this.effects.length>this.config.settings.maxEffects)this.effects.shift()}
 private remove(id:number){const item=this.objects.get(id);if(item?.body)Composite.remove(this.physics.world,item.body);this.objects.delete(id)}
 private spawn(kind:string,icon:string,color:string,options:{x?:number;y?:number;size?:number;static?:boolean;ttl?:number;vx?:number;vy?:number}={}){
  while(this.objects.size>=this.config.settings.maxObjects)this.remove(this.objects.keys().next().value!);
  const x=options.x??(460+this.random()*280),y=options.y??(-20-this.random()*80),size=options.size??25;
  const decorative=options.static===true;
  let body:Matter.Body|undefined;
  if(!decorative){
   const props={restitution:kind==='ball'?.78:kind==='diamond'?.6:.18,friction:.4,density:kind==='snow'?.0001:.001,label:kind};
   body=['cube','brick','mystery','cake'].includes(kind)?Bodies.rectangle(x,y,size*1.6,size,props):kind==='diamond'?Bodies.polygon(x,y,5,size,props):Bodies.circle(x,y,size,props);
   Composite.add(this.physics.world,body);if(options.vx||options.vy)Body.setVelocity(body,{x:options.vx||0,y:options.vy||0});
  }
  const id=body?.id??(100000+this.id());
  this.objects.set(id,{id,body,kind,icon,color,width:['brick','cube','mystery','cake'].includes(kind)?size*1.6:size*2,height:['brick','cube','mystery','cake'].includes(kind)?size:size*2,radius:size,born:this.time,ttl:options.ttl??(decorative?3600000:22000),physics:!decorative,...(decorative?{x,y}: {})} as Meta);
  return id;
 }
 private fx(kind:string,icon:string,x:number,y:number,ttl=2500,color='#de8c6d'){
  if(!this.config.settings.animations)return;
  if(this.effects.length>=this.config.settings.maxEffects)this.effects.shift();
  this.effects.push({id:this.id(),kind,icon,x,y,born:this.time,ttl,seed:this.random()*100,color});
 }
 private run(s:ActionStep,user:{id:string;name:string}){
  const def=actionById(s.action);if(!def)return;
  const n=Math.max(1,Math.min(24,Math.round(s.value))),seconds=Math.max(1,Math.min(60,s.value))*1000;
  const x=this.character.position.x,y=this.character.position.y;
  this.executions++;
  if(s.sound&&this.config.settings.soundVolume>0){this.sounds.push({id:this.id(),action:s.soundId||s.action,time:this.time});this.sounds=this.sounds.slice(-50)}
  const decorate=['flower','tree','mushroom','sunflower'];
  const animal=['cat','dog','lion','duck'];
  const physical=['ball','cube','star','brick','mystery','diamond','coin','snow'];
  if(decorate.includes(s.action))for(let i=0;i<n;i++)this.spawn(s.action,def.icon,def.colors[0],{static:true,x:120+this.random()*960,y:650+this.random()*37,size:s.action==='tree'?45:25});
  else if(physical.includes(s.action))for(let i=0;i<n;i++)this.spawn(s.action,def.icon,def.colors[0],{size:s.action==='brick'?22:s.action==='snow'?12:20,ttl:s.action==='snow'?9000:22000});
  else if(animal.includes(s.action))for(let i=0;i<n;i++)this.spawn(s.action,def.icon,def.colors[0],{x:400+this.random()*80,y:430,size:s.action==='lion'?35:25,vx:s.action==='dog'?5:2});
  else if(['bird','fish','butterflies','rainbow','hearts','confetti','fireworks','bubbles'].includes(s.action)){
   const count=s.action==='rainbow'?1:n;
   for(let i=0;i<count;i++)this.fx(s.action,def.icon,s.action==='rainbow'?600:100+this.random()*1000,s.action==='rainbow'?150:s.action==='hearts'?500:150+this.random()*370,s.action==='rainbow'?seconds:3200,def.colors[i%2]);
  }else if(s.action==='hat'){this.spawn('hat','🎩','#3b4341',{x,y:y-180,size:24,ttl:1200});this.modifiers.push({kind:'hat',until:this.time+1100,value:1})}
  else if(s.action==='crown')this.hat='👑';
  else if(s.action==='cape')this.cape=true;
  else if(s.action==='grow_character')this.resizeCharacter(s.value);
  else if(s.action==='restore_character')this.resizeCharacter(100);
  else if(s.action==='move_left')Body.setVelocity(this.character,{x:-Math.min(15,s.value),y:this.character.velocity.y});
  else if(s.action==='move_right')Body.setVelocity(this.character,{x:Math.min(15,s.value),y:this.character.velocity.y});
  else if(s.action==='jump')Body.setVelocity(this.character,{x:this.character.velocity.x,y:-Math.min(15,s.value)});
  else if(s.action==='grow_platform')this.resizePlatform(this.platform.bounds.max.x-this.platform.bounds.min.x+s.value);
  else if(s.action==='shrink_platform')this.resizePlatform(this.platform.bounds.max.x-this.platform.bounds.min.x-s.value);
  else if(s.action==='earthquake')this.modifiers.push({kind:'quake',until:this.time+seconds,value:22});
  else if(s.action==='fan_left'||s.action==='fan_right')this.modifiers.push({kind:'wind',until:this.time+seconds,value:s.action==='fan_left'?-1:1});
  else if(s.action==='low_gravity'||s.action==='high_gravity')this.modifiers.push({kind:'gravity',until:this.time+seconds,value:s.action==='low_gravity'?.25:1.65});
  else if(s.action==='stop_wind')this.modifiers=this.modifiers.filter(m=>m.kind!=='wind');
  else if(s.action==='restore_gravity')this.modifiers=this.modifiers.filter(m=>m.kind!=='gravity');
  else if(s.action==='bounce'){for(const body of Composite.allBodies(this.physics.world))if(!body.isStatic)Body.setVelocity(body,{x:body.velocity.x,y:-Math.min(14,s.value)});}
  else if(s.action==='crystal_rain')for(let i=0;i<n;i++)this.spawn('diamond','💎','#87aec4',{x:220+this.random()*760,y:-20-this.random()*180,size:18});
  else if(s.action==='shower')for(let i=0;i<n;i++)this.modifiers.push({kind:'ball',until:this.time+250*i+1,value:1});
  else if(s.action==='rocket'){this.spawn('rocket','🚀','#d68365',{x:-50,y:210,size:33,vx:17,vy:-1,ttl:5000});this.fx('smoke','☁️',200,250,3500)}
  else if(s.action==='birthday'){this.theme='party';this.spawn('cake','🎂','#e3a8a3',{x:600,y:30,size:35});for(let i=0;i<16;i++)this.fx('confetti','🎉',250+this.random()*700,130+this.random()*200,3500,def.colors[i%2])}
  else if(s.action==='sparkles')this.modifiers.push({kind:'trail',until:this.time+seconds,value:0});
  else if(['day','night','autumn','ocean','party'].includes(s.action))this.theme=s.action;
  else if(s.action==='points')this.score(user.id,Math.round(s.value));
  else if(s.action==='remove_points')this.score(user.id,-Math.round(s.value));
  else if(s.action==='message')this.message={text:s.message||`Olá, ${user.name}!`,viewer:user.name,until:this.time+seconds};
  else if(s.action==='timer')this.timerEnd=this.time+seconds;
  else if(s.action==='balance'||s.action==='collect'){
   if(this.character.position.y>H||this.game.status==='lost'){Body.setPosition(this.character,{x:600,y:430});Body.setVelocity(this.character,{x:0,y:0})}
   this.game={status:'playing',name:s.action==='collect'?'Caça às estrelas':'A ilha do equilíbrio',remaining:seconds/1000,score:0,target:s.action==='collect'?3:1};this.gameEnd=this.time+seconds;this.miniOwner=user.id;this.nextStar=this.time;
  }else if(s.action==='clear_objects')for(const id of [...this.objects.keys()])this.remove(id);
  // 'sound' has no scene mutation by design: its consequence is the audio signature.
  if(s.action!=='message')this.message={text:`${def.name} · ${user.name}`,viewer:user.name,until:this.time+2400};
  this.log('action',user.name,def.name);
 }
 private finishGame(won:boolean){this.game.status=won?'won':'lost';this.game.remaining=0;if(won){this.score(this.miniOwner,25);for(let i=0;i<12;i++)this.fx('confetti','🎊',300+this.random()*600,130,3000)}else this.fx('defeat','☁️',600,420,3000);this.log(won?'win':'loss','Minigame',won?'Objetivo cumprido! +25 pontos.':'O personagem caiu ou o tempo terminou. Recomece sem custo.','system')}
 tick(delta=1000/60){
  if(this.paused)return;
  const dt=Math.max(0,Math.min(50,delta));this.time+=dt;
  // Jobs with a future delay never block ready higher/lower-priority work.
  if(this.time-this.lastAction>=180){
   const ready=this.jobs.filter(j=>j.due<=this.time).sort((a,b)=>b.priority-a.priority||a.seq-b.seq)[0];
   if(ready){const s=ready.steps[ready.index];this.run(s,this.user(ready.viewerId,ready.viewer));this.lastAction=this.time;ready.index++;if(ready.index>=ready.steps.length)this.jobs=this.jobs.filter(j=>j!==ready);else ready.due=this.time+ready.steps[ready.index].delay}
  }
  const expired=this.modifiers.filter(m=>m.until<=this.time);
  for(const m of expired){if(m.kind==='hat')this.hat='🎩';if(m.kind==='ball')this.spawn('ball','⚽','#d9906f');}
  this.modifiers=this.modifiers.filter(m=>m.until>this.time);
  const wind=this.modifiers.filter(m=>m.kind==='wind').reduce((n,m)=>n+m.value,0);
  this.physics.gravity.y=this.modifiers.filter(m=>m.kind==='gravity').at(-1)?.value??1;
  const quake=this.modifiers.some(m=>m.kind==='quake');
  Body.setPosition(this.platform,{x:600+(quake?Math.sin(this.time*.04)*18:0),y:520+(quake?Math.cos(this.time*.05)*5:0)});
  if(quake)Body.applyForce(this.character,this.character.position,{x:Math.sin(this.time*.04)*this.character.mass*.0012,y:0});
  for(const body of Composite.allBodies(this.physics.world))if(!body.isStatic){if(wind)Body.applyForce(body,body.position,{x:wind*.00065*body.mass,y:0});if(Math.abs(body.velocity.x)>24)Body.setVelocity(body,{x:Math.sign(body.velocity.x)*24,y:body.velocity.y});}
  for(let rest=dt;rest>0;rest-=1000/60)Engine.update(this.physics,Math.min(rest,1000/60));
  for(const [id,obj]of this.objects){
   const pos=obj.body?.position;
   if(this.time-obj.born>obj.ttl||(pos&&(pos.y>1100||pos.x< -300||pos.x>1500))){this.remove(id);continue}
   if(obj.kind==='mystery'&&this.time-obj.born>1500){const x=pos!.x,y=pos!.y;this.remove(id);for(let i=0;i<3;i++)this.spawn(i%2?'diamond':'ball',i%2?'💎':'⚽','#e8bc76',{x:x+(i-1)*30,y:y-35,vx:(i-1)*3,vy:-5});this.fx('sparkles','✨',x,y,1500)}
  }
  this.effects=this.effects.filter(f=>this.time-f.born<f.ttl);
  if(this.modifiers.some(m=>m.kind==='trail')&&Math.floor(this.time/180)!==Math.floor((this.time-dt)/180))this.fx('sparkles','✨',this.character.position.x,this.character.position.y+15,900);
  if(this.message&&this.message.until<=this.time)this.message=null;
  if(this.timerEnd!==null&&this.time>=this.timerEnd){this.timerEnd=null;this.fx('fireworks','🎉',600,210,2000);this.log('timer','Cronômetro','Tempo concluído.','system')}
  if(this.character.position.y>H+50&&this.game.status!=='lost')this.finishGame(false);
  if(this.game.status==='playing'){
   this.game.remaining=Math.max(0,(this.gameEnd-this.time)/1000);
   if(this.game.name==='Caça às estrelas'&&this.time>=this.nextStar){this.spawn('star','⭐','#e6bf63',{x:this.character.position.x+(this.random()-.5)*100,y:20,size:17});this.nextStar=this.time+1900}
   if(this.time>=this.gameEnd)this.finishGame(this.game.name==='A ilha do equilíbrio');
  }
 }
 snapshot():State{
  const p=this.platform.position,c=this.character.position;
  return{session:this.session,time:this.time,paused:this.paused,theme:this.theme,objects:[...this.objects.values()].map(meta=>{const{body,...view}=meta;return{...view,x:body?.position.x??(meta as unknown as {x:number}).x,y:body?.position.y??(meta as unknown as {y:number}).y,angle:body?.angle??0,vx:body?.velocity.x??0,vy:body?.velocity.y??0}}),effects:clone(this.effects),character:{x:c.x,y:c.y,angle:this.character.angle,radius:this.radius,hat:this.hat,cape:this.cape},platform:{x:p.x,y:p.y,width:this.platform.bounds.max.x-this.platform.bounds.min.x,height:24},game:clone(this.game),timer:this.timerEnd===null?null:Math.max(0,(this.timerEnd-this.time)/1000),wind:this.modifiers.filter(m=>m.kind==='wind').reduce((n,m)=>n+m.value,0),gravity:this.physics.gravity.y,message:clone(this.message),queue:this.jobs.slice().sort((a,b)=>b.priority-a.priority||a.seq-b.seq).map(j=>({id:j.id,viewer:j.viewer,label:j.label,priority:j.priority,remaining:j.steps.length-j.index})),history:clone(this.logs),sounds:clone(this.sounds),ranking:[...this.users.values()].filter(u=>u.score>0).sort((a,b)=>b.score-a.score).slice(0,10).map(u=>({...u})),counts:clone(this.counts),goals:this.config.rules.filter(r=>r.trigger==='goal'&&r.enabled).map(r=>({id:r.id,name:r.name,target:r.target,reached:this.goalHits.has(r.id)})),executions:this.executions,config:this.getConfig(),notice:this.notice};
 }
}
