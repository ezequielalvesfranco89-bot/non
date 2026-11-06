import type {State} from './types';

export type MusicMood='idle'|'battle'|'climax'|'victory';
export function musicMood(state:State):MusicMood{
  if(state.battle.status==='victory')return 'victory';
  if(state.battle.status!=='running')return 'idle';
  return state.battle.boss.hp/state.battle.boss.max_hp<=.25?'climax':'battle';
}
const midi=(note:number)=>440*2**((note-69)/12);
const melody=[0,7,10,7,3,7,12,10,5,7,10,14,12,10,7,3];
const roots=[0,-5,-3,-7];

/** Original eight-bar score. Audio is created only after an explicit gesture. */
export class MusicDirector{
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  private voices=new Set<OscillatorNode>();
  private timer:ReturnType<typeof setInterval>|null=null;
  private state:State|null=null;
  private next=0;
  private step=0;
  private enabled=false;
  private duckUntil=0;
  private lastMood:MusicMood='idle';
  async enable(){
    this.ctx??=new AudioContext();
    if(!this.master){
      const compressor=this.ctx.createDynamicsCompressor();
      compressor.threshold.value=-20;compressor.ratio.value=4;compressor.knee.value=20;
      this.master=this.ctx.createGain();this.master.gain.value=0;
      this.master.connect(compressor);compressor.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    this.enabled=true;this.next=this.ctx.currentTime+.05;this.step=0;
    if(!this.timer)this.timer=setInterval(()=>this.schedule(),35);
    this.schedule();
  }
  update(state:State){this.state=state;}
  duck(){if(this.ctx)this.duckUntil=this.ctx.currentTime+1.8;}
  async disable(){
    this.enabled=false;
    if(this.timer){clearInterval(this.timer);this.timer=null;}
    this.voices.forEach(voice=>{try{voice.stop()}catch{/* already ended */}});
    this.voices.clear();
    if(this.master&&this.ctx)this.master.gain.setValueAtTime(0,this.ctx.currentTime);
    await this.ctx?.suspend();
  }
  dispose(){void this.disable().then(()=>this.ctx?.close());}
  private tone(note:number,time:number,duration:number,level:number,wave:OscillatorType='sine'){
    if(!this.ctx||!this.master||this.voices.size>=28)return;
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=wave;osc.frequency.value=midi(note);
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(level,time+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(this.master);this.voices.add(osc);
    osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect()};
    osc.start(time);osc.stop(time+duration+.02);
  }
  private kick(time:number){
    if(!this.ctx||!this.master||this.voices.size>=28)return;
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.frequency.setValueAtTime(85,time);osc.frequency.exponentialRampToValueAtTime(37,time+.18);
    gain.gain.setValueAtTime(.11,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.2);
    osc.connect(gain);gain.connect(this.master);this.voices.add(osc);
    osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect()};osc.start(time);osc.stop(time+.22);
  }
  private schedule(){
    const c=this.ctx,s=this.state;if(!c||!s||!this.master||!this.enabled)return;
    const mood=musicMood(s),active=mood!=='idle'&&s.settings.music_enabled;
    const duck=c.currentTime<this.duckUntil?.32:1;
    const gain=active?s.settings.music_volume*.30*duck:0;
    this.master.gain.setTargetAtTime(gain,c.currentTime,.16);
    if(!active){this.next=c.currentTime+.05;return;}
    const ambient=s.settings.music_style==='ambient';
    const bpm=ambient?82:mood==='climax'?116:100;
    const eighth=60/bpm/2;
    if(this.next<c.currentTime)this.next=c.currentTime+.03; // Never replay a burst after a throttled tab.
    if(mood==='victory'&&this.lastMood!=='victory'){
      [0,4,7,12].forEach((n,i)=>this.tone(60+n,c.currentTime+.05+i*.10,.7,.12));
    }
    this.lastMood=mood;
    if(mood==='victory')return;
    while(this.next<c.currentTime+.13){
      const bar=Math.floor(this.step/8),beat=this.step%8;
      const key=s.battle.boss.kind==='golem'?57:s.battle.boss.kind==='specter'?60:62;
      const root=roots[Math.floor(bar/2)%roots.length];
      if(beat===0){
        this.tone(key+root-12,this.next,.9,.20,'triangle');
        this.tone(key+root,this.next,1.4,.055);
        this.tone(key+root+7,this.next,1.4,.045);
      }
      if(!ambient||beat%2===0){
        const shift=bar%8>=4?5:0;
        this.tone(key+12+melody[(this.step+shift)%melody.length],this.next,ambient?.65:.30,.095,'triangle');
      }
      if(!ambient&&beat%4===0)this.kick(this.next);
      if(mood==='climax'&&!ambient&&beat%2===1)this.tone(key+24+melody[this.step%16],this.next,.12,.025);
      this.next+=eighth;this.step=(this.step+1)%128;
    }
  }
}
