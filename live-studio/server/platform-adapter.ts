import type {InputEvent} from '../src/types.js';
/** A future authorized adapter must validate platform signatures/OAuth before emitting.
 * No implementation here claims to receive real TikTok/YouTube/Twitch events. */
export type AuthorizedEvent=Omit<InputEvent,'source'> & {platform:'tiktok'|'youtube'|'twitch';verified:true};
export interface PlatformAdapter{
 capabilities():{connected:boolean;events:string[];reason:string};
 start():Promise<void>;
 stop():Promise<void>;
}
export class UnconfiguredAdapter implements PlatformAdapter{
 constructor(readonly platform:'tiktok'|'youtube'|'twitch'){}
 capabilities(){return{connected:false,events:[],reason:'Integração autorizada não implementada/configurada. Use o simulador.'}}
 async start():Promise<void>{throw Error(`${this.platform}: não há uma conexão real disponível nesta versão.`)}
 async stop(){}
}
