import {useEffect,useRef} from 'react';
import type {SceneObject,State} from './types.js';
import type {StudioRuntime} from './runtime';
const W=1200,H=720;
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function emoji(ctx:CanvasRenderingContext2D,icon:string,x:number,y:number,size:number){ctx.font=`${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,x,y)}
function background(ctx:CanvasRenderingContext2D,s:State,transparent:boolean){
 if(!transparent){
  const themes:Record<string,string[]>={day:['#dceee9','#f3f1d9','#a9c7b2','#819e88'],night:['#384a66','#7d869f','#708597','#526f77'],autumn:['#f1dcc4','#f7e8ce','#d5b07d','#ad956a'],ocean:['#d5e8ed','#e4f0e3','#9bc8cd','#6ca9af'],party:['#f7e2d7','#f9ecd3','#bdd0ae','#87ad99']};
  const c=themes[s.theme]||themes.day,gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,c[0]);gradient.addColorStop(1,c[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ellipse(ctx,1010,100,54,54,s.theme==='night'?'#f2e5b6':'#f0ca83');
  for(const[x,y,k]of [[180,114,1],[760,78,.7],[1110,215,.8]] as number[][]){ellipse(ctx,x,y,55*k,17*k,'#ffffff88');ellipse(ctx,x-17*k,y-10*k,24*k,20*k,'#ffffff88');ellipse(ctx,x+15*k,y-14*k,31*k,25*k,'#ffffff88')}
  ctx.fillStyle=c[2];ctx.beginPath();ctx.moveTo(0,520);ctx.bezierCurveTo(180,280,340,470,570,450);ctx.bezierCurveTo(800,300,980,400,1200,470);ctx.lineTo(1200,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle=c[3];ctx.beginPath();ctx.moveTo(0,650);ctx.bezierCurveTo(280,530,280,670,540,610);ctx.bezierCurveTo(820,520,1000,620,1200,580);ctx.lineTo(1200,H);ctx.lineTo(0,H);ctx.fill();
  if(s.theme==='ocean'){ctx.strokeStyle='#e6f1e266';ctx.lineWidth=4;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(i*110,665);ctx.quadraticCurveTo(i*110+30,655,i*110+70,665);ctx.stroke()}}
  if(s.theme==='party'){ctx.strokeStyle='#b5a38f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,30);ctx.quadraticCurveTo(600,150,1200,30);ctx.stroke();for(let i=0;i<12;i++){ctx.fillStyle=['#d88c79','#e4c478','#8bac9a','#a1b7cf'][i%4];const x=i*100+30,y=50+Math.sin(i/12*Math.PI)*40;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+45,y+8);ctx.lineTo(x+20,y+48);ctx.fill()}}
 }
 ellipse(ctx,600,622,260,35,'#37534720');
}
function drawObject(ctx:CanvasRenderingContext2D,o:SceneObject,time:number){
 const age=time-o.born;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.angle);
 const growth=o.physics?1:Math.min(1,age/800);ctx.scale(growth,growth);
 if(o.kind==='ball'){ellipse(ctx,0,0,o.radius,o.radius,o.color);ellipse(ctx,-o.radius*.28,-o.radius*.3,o.radius*.22,o.radius*.18,'#fff8');ctx.strokeStyle='#f9f0df';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,o.radius*.64,-.7,2);ctx.stroke()}
 else if(o.kind==='cube'||o.kind==='brick'){round(ctx,-o.width/2,-o.height/2,o.width,o.height,4,o.color);ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.strokeRect(-o.width/2+4,-o.height/2+4,o.width-8,o.height-8)}
 else if(o.kind==='diamond'){ctx.fillStyle=o.color;ctx.beginPath();ctx.moveTo(0,-o.radius);ctx.lineTo(o.radius,0);ctx.lineTo(0,o.radius);ctx.lineTo(-o.radius,0);ctx.fill();ctx.strokeStyle='#e5f0ed';ctx.beginPath();ctx.moveTo(0,-o.radius);ctx.lineTo(o.radius*.3,0);ctx.lineTo(0,o.radius);ctx.stroke()}
 else if(o.kind==='snow'){ellipse(ctx,0,0,o.radius,o.radius,'#ffffffd9')}
 else if(o.kind==='flower'||o.kind==='sunflower'){ctx.strokeStyle='#487b5c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,12);ctx.quadraticCurveTo(8,35,0,53);ctx.stroke();ellipse(ctx,-9,33,13,5,'#619477');emoji(ctx,o.icon,0,0,o.radius*2)}
 else if(o.kind==='tree'){emoji(ctx,'🌳',0,-o.radius*.25,o.radius*2.2)}
 else emoji(ctx,o.icon,0,0,o.radius*2);
 ctx.restore();
}
function character(ctx:CanvasRenderingContext2D,s:State){
 const c=s.character,r=c.radius;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);
 if(c.cape){ctx.fillStyle='#d57b71';ctx.beginPath();ctx.moveTo(-r*.6,0);ctx.lineTo(-r*1.7,r*1.3);ctx.lineTo(r*.4,r);ctx.fill()}
 ellipse(ctx,0,r*.8,r*.68,r*.25,'#b77e57');round(ctx,-r,-r*.9,r*2,r*1.8,r*.65,'#edba87');
 ctx.fillStyle='#edba87';ctx.beginPath();ctx.moveTo(-r,-r*.4);ctx.lineTo(-r*.9,-r*1.4);ctx.lineTo(-r*.3,-r*.7);ctx.fill();ctx.beginPath();ctx.moveTo(r,-r*.4);ctx.lineTo(r*.9,-r*1.4);ctx.lineTo(r*.3,-r*.7);ctx.fill();
 ellipse(ctx,-r*.38,-r*.1,r*.075,r*.12,'#34463c');ellipse(ctx,r*.38,-r*.1,r*.075,r*.12,'#34463c');ellipse(ctx,-r*.6,r*.22,r*.18,r*.1,'#dc8f79');ellipse(ctx,r*.6,r*.22,r*.18,r*.1,'#dc8f79');
 ctx.strokeStyle='#8f654b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,r*.26);ctx.quadraticCurveTo(0,r*.43,4,r*.26);ctx.stroke();
 round(ctx,-r*1.05,r*.52,r*2.1,r*.24,5,'#be6c58');if(c.hat)emoji(ctx,c.hat,0,-r*1.35,r*1.65);
 ctx.restore();
}
export default function Scene({runtime,state,transparent=false}:{runtime:StudioRuntime;state:State;transparent?:boolean}){
 const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);const current=useRef(state);current.current=state;
 useEffect(()=>{const node=canvas.current,container=host.current;if(!node||!container)return;const ctx=node.getContext('2d');if(!ctx)return;let frame=0,width=1,height=1;
  const resize=()=>{const rect=container.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);node.width=width*dpr;node.height=height*dpr;node.style.width=`${width}px`;node.style.height=`${height}px`};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const render=()=>{const s=runtime.read();const scale=Math.min(width/W,height/H),dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate((width-W*scale)/2,(height-H*scale)/2);ctx.scale(scale,scale);background(ctx,s,transparent);
   const p=s.platform;round(ctx,p.x-p.width/2,p.y-12,p.width,24,8,'#946d4e');round(ctx,p.x-p.width/2,p.y-13,p.width,8,5,'#6f9675');
   for(let x=p.x-p.width/2+20;x<p.x+p.width/2;x+=45)round(ctx,x,p.y+2,25,3,2,'#b48c67');
   s.objects.filter(o=>!o.physics).forEach(o=>drawObject(ctx,o,s.time));
   s.objects.filter(o=>o.physics).forEach(o=>drawObject(ctx,o,s.time));
   for(const f of s.effects){const t=(s.time-f.born)/f.ttl;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(1-t)*2));
    if(f.kind==='rainbow'){ctx.lineWidth=12;['#d98a7e','#e5b86d','#9abb8e','#98b9c8'].forEach((color,i)=>{ctx.strokeStyle=color;ctx.beginPath();ctx.arc(600,350,180-i*15,Math.PI,Math.PI*2);ctx.stroke()})}
    else if(f.kind==='fireworks'){ctx.translate(f.x,f.y);ctx.strokeStyle=f.color;ctx.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*t*50,Math.sin(a)*t*50);ctx.lineTo(Math.cos(a)*t*100,Math.sin(a)*t*100);ctx.stroke()}}
    else if(f.kind==='confetti'){ctx.translate(f.x+Math.sin(f.seed)*t*150,f.y+t*t*240-70*t);ctx.rotate(f.seed+t*4);round(ctx,-5,-9,10,18,2,f.color)}
    else{const x=f.kind==='bird'||f.kind==='butterflies'?f.x+t*280+Math.sin(t*12+f.seed)*25:f.kind==='smoke'?f.x-t*120:f.x+Math.sin(t*5+f.seed)*50;const y=f.kind==='bird'||f.kind==='butterflies'?f.y+Math.sin(t*8+f.seed)*40:f.y-t*170;emoji(ctx,f.icon,x,y,f.kind==='defeat'?90:30+(f.seed%14))}
    ctx.restore();
   }
   if(s.wind){ctx.strokeStyle='#ffffffaa';ctx.lineWidth=3;for(let i=0;i<7;i++){const x=(s.time*.15*Math.sign(s.wind)+i*190)%1400-100,y=200+i%4*70;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+50,y-12,x+85,y);ctx.stroke()}}
   character(ctx,s);
   if(s.game.status==='lost'){ctx.fillStyle='#fff7e8ee';ctx.fillRect(360,200,480,110);ctx.textAlign='center';ctx.fillStyle='#70493c';ctx.font='bold 28px Arial';ctx.fillText('Ops! Vamos tentar outra vez?',600,245);ctx.font='18px Arial';ctx.fillText('Reinicie a cena. As regras continuam salvas.',600,282)}
   if(s.game.status==='won'){ctx.fillStyle='#eef5e7ee';ctx.fillRect(380,180,440,90);ctx.textAlign='center';ctx.fillStyle='#426b50';ctx.font='bold 28px Arial';ctx.fillText('Objetivo cumprido! +25 pontos',600,235)}
   frame=requestAnimationFrame(render);
  };render();return()=>{cancelAnimationFrame(frame);observer.disconnect()}
 },[runtime,transparent]);
 return <div ref={host} className="scene-canvas"><canvas ref={canvas} role="img" aria-label={`Ilha interativa: ${state.objects.length} objetos, plataforma de ${Math.round(state.platform.width)} pixels${state.game.status==='lost'?', personagem caiu':''}.`}/></div>
}
