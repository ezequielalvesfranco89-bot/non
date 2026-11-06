# Shared implementation contract

Work root: `/workspace/non/tiktok-live-battle`. Do not touch the existing Maxon site.
Python package: `backend/battle`. Frontend React + TypeScript + PixiJS, built into frontend/dist.

## State (`GET /api/state`, websocket messages `{type:'state',data:state}`)

```
{
  mode: 'test'|'live',
  connection: {status:'disconnected'|'connecting'|'connected'|'reconnecting'|'error', username:'', error:null|string, follow_supported:bool, attempt:0},
  battle: {status:'idle'|'running'|'paused'|'victory'|'defeat', level:1, boss:{name:'',kind:'golem'|'specter'|'dragon',hp:1500,max_hp:1500}, team_hp:100,team_max_hp:100,bosses_defeated:0,total_damage:0,combo:0,power_until:0},
  session: {id:'uuid',followers:0,gifts:0,likes:0,comments:0,participants:0,goals:[{id:'goal-5',target:5,reached:false}]},
  ranking:[{user_id:'',name:'',avatar:null,damage:0}],
  events:[{id:'',type:'gift'|'follow'|'like'|'comment'|'system'|'goal'|'victory'|'defeat',name:'',message:'',amount:0,source:'simulation'|'tiktok'|'system',timestamp:unix_seconds}],
  history:[{level:1,boss:'',damage:0,result:'victory'|'defeat',timestamp:unix_seconds}],
  settings: {monster_hp:1500,difficulty_multiplier:1.18,boss_attack_interval:12,boss_attack_damage:8,transition_seconds:3,volume:0.35,animations:true,like_damage:1,comment_damage:15,
    gift_rules:[{gift_id:'demo-rose',name:'Rosa (teste)',damage:35,multiplier:1,animation:'slash',sound:'hit',enabled:true}],
    follow_action:{enabled:true,type:'damage'|'heal'|'power',amount:100,animation:'spark',sound:'follow'},
    follower_goals:[{id:'goal-5',target:5,action:{enabled:true,type:'damage',amount:500,animation:'burst',sound:'victory'}}]
  },
  known_gifts:[{gift_id:'',name:''}]
}
```

Live/test modes have separate NEW sessions on explicit mode switch (reset engine/clear counters and per-session dedup/rewards, retain SQLite history/settings). No simulation accepted in live mode. No connection allowed in test mode. The frontend must clearly label simulation in stage and activity. Follow dedup by message ID and distinct stable user ID per session; a repeated follow by the same user never yields additional session rewards. Event identity is scoped by source/session, persisted in SQLite. Gift combo messages may be cumulative: count only positive repeat-count deltas; repeated replay never yields additional damage. Ranking based on damage actually applied (boss overkill capped). No individual follows inferred from total follower counts.

## Commands (JSON response `{ok:true,state}` or HTTP4xx `{detail:...}`)
- `POST /api/control` `{action:'start'|'pause'|'reset'|'next'|'boss'|'clear_ranking'}`
- `POST /api/session` `{mode:'test'|'live'}` resets battle and counters, disconnect required.
- `PUT /api/settings` full settings as above (validate types/ranges/IDs, preserve SQLite).
- `POST /api/simulate` `{type:'gift'|'follow'|'like'|'comment'|'disconnect'|'reconnect',user_id?:string,name?:string,gift_id?:string,repeat_count?:int,combo_id?:string,event_id?:string,like_count?:int,text?:string}`. Default random stable demo user. `repeat_count` is cumulative per combo_id. Optional event_id allows intentional replay tests.
- `POST /api/connection` `{action:'connect'|'disconnect',username?:string}`
- websocket `/ws` sends complete state on change; server is authoritative; renderer derives effects from latest unseen state.events. Initial state always sent. No websocket commands.

## Backend interfaces
Engine author owns `battle/engine.py`, `battle/storage.py`, `battle/models.py`, engine tests.
- `Store(path: str)` initializes SQLite schema. `close()`.
- `Engine(store, clock=time.time)`; `snapshot()` JSON serializable state (connection added by server); `handle_event(event:dict)`; `tick()`; `control(action:str)`; `set_mode(mode:str)`; `update_settings(dict)`; `.mode` string.
- `handle_event` expects `{event_id,source:'simulation'|'tiktok',type:'gift'|'follow'|'like'|'comment',user_id,name,avatar?,gift_id?,gift_name?,repeat_count?:int,combo_id?:string,like_count?:int,text?:string}`.
- Engine only mutated from server's single asyncio lock/consumer. `tick` called every0.25s under same lock. `handle_event` should validate source matches mode. Return value implementation-defined. Engine pure synchronous, no network.
- Engine defaults should contain 4 demo gifts (rose/basic,strong,critical,legendary) and follower goals at5,10,25. Real IDs configurable from panel. Bonus power defined as damage multiplier during amount seconds (bounded1..120). No name-only matching for gifts. Unconfigured live gift logged but not invented damage.

Integration author owns `battle/tiktok.py`, adapter tests, `INTEGRATION.md`:
- `TikTokAdapter(emit: async callable(event_dict), on_status: async callable(status_dict))`
- `async connect(username)` starts reconnect task and returns quickly; `async disconnect()` cancels task; `capabilities()` -> `{available:bool,follow_supported:bool,version:str|None,reason:str|None}`.
- Lazy optional TikTokLive import. Verify CURRENT official library source/docs before implementing. FollowEvent vs aggregated SocialEvent must be correctly mapped; no counter inference. Actual signature + room IDs for combo identity and per-live stable gift combo keys. Every event normalized to above and marked tiktok. Adapter may log additional metadata, never credentials. No interactive authentication, no restriction bypass, no sign-provider secrets invented. Stop/retry according to actual errors; expose missing credentials/denied network as errors.

Root owns server API/queue/lifecycle and Windows scripts/docs/tests.
Frontend author owns entire frontend, UI tests if useful. Use relative API/ws URLs, Vite proxy for dev; no fake connection or pretend gifts. If no server, show offline notice. Overlay `/overlay?layout=vertical|horizontal&transparent=1` (no admin controls), fullscreen button admin only. Admin desktop stage/sidebar/dashboard, gift editor and follower action/goals editors, simulator, controls, metrics, activity and history. Renderer uses actual state not independent damage. WebAudio sounds after gesture. Responsive modern arcade dark purple/cyan style, visually polished procedural art. Render performance target60fps; bounded particles/damage labels/alerts, accessibility/reduced-motion, avatars when available. Text React/Pixi escaped, no raw HTML from viewers. Overlay follows websocket reconnect, clearly label test mode.

Implemented extensions: settings.appearance (eclipse/ember/ocean), settings.boss_names (golem/specter/dragon), history.mode for explicit test/live provenance; names apply on next boss.
