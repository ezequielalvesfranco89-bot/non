import {ACTIONS} from './catalog.js';
export class StudioAudio{
 private context:AudioContext|null=null;private master:GainNode|null=null;private voices=new Set<OscillatorNode>();enabled=false;
 async toggle(){if(this.enabled){this.enabled=false;this.voices.forEach(v=>{try{v.stop()}catch{}});await this.context?.suspend();return false}this.context??=new AudioContext();if(!this.master){this.master=this.context.createGain();this.master.gain.value=.1;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(this.context.destination)}await this.context.resume();this.enabled=true;return true}
 play(action:string,volume:number){
  if(!this.enabled||!this.context||!this.master||volume<=0)return;
  const index=Math.max(0,ACTIONS.findIndex(a=>a.id===action)),ctx=this.context;
  this.master.gain.setTargetAtTime(volume*.32,ctx.currentTime,.025);
  const base=action==='lion'?65:action==='earthquake'?80:230*2**((index%12)/12);
  [0,3+(Math.floor(index/12)%6),7+(index%3)].forEach((semitones,i)=>{
   if(this.voices.size>=24)return;
   const osc=ctx.createOscillator(),gain=ctx.createGain();const at=ctx.currentTime+i*.075;
   osc.type=['lion','earthquake','rocket'].includes(action)?'triangle':index%3===0?'sine':'triangle';
   osc.frequency.setValueAtTime(base*2**(semitones/12),at);
   if(action==='rocket')osc.frequency.exponentialRampToValueAtTime(1000,at+.25);
   if(action==='lion')osc.frequency.exponentialRampToValueAtTime(45,at+.4);
   gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.18,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+(action==='lion'?.5:.22+(index%5)*.025));
   osc.connect(gain);gain.connect(this.master!);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect()};osc.start(at);osc.stop(at+.58);
  });
 }
 close(){this.voices.forEach(v=>{try{v.stop()}catch{}});this.voices.clear();void this.context?.close()}
}
