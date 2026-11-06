"""Authoritative, deterministic battle engine. All accepted effects persist atomically."""
from __future__ import annotations
import copy
import time
import uuid
from contextlib import contextmanager
from .models import Settings, NormalizedEvent, validate_settings, clean_text

BOSSES = [('Guardião de Obsidiana', 'golem'), ('Espectro do Eclipse', 'specter'), ('Dragão da Tempestade', 'dragon')]

class Engine:
    def __init__(self, store, clock=time.time):
        self.store, self.clock = store, clock
        settings = validate_settings(store.get('settings', Settings().model_dump()))
        self.data = store.get('state') or self._fresh('test', settings)
        self.data['settings'] = settings
        self._v2_defaults()
        # A restart never silently runs a battle while the broadcaster is absent.
        if self.data['battle']['status'] in ('running', 'victory'):
            self.data['battle']['status'] = 'paused'
        self.data['last_attack'] = self.clock()
        with self.store.transaction(): self._save()

    @property
    def mode(self): return self.data['mode']

    def _boss(self, level, settings):
        name, kind = BOSSES[(level - 1) % len(BOSSES)]
        name = settings['boss_names'].get(kind,name)
        hp = min(100_000_000, round(settings['monster_hp'] * min(3.0, settings['difficulty_multiplier'] ** min(level - 1, 30))))
        return dict(name=name, kind=kind, hp=hp, max_hp=hp)

    def _fresh(self, mode, settings):
        return dict(mode=mode, settings=settings, battle=dict(status='idle', level=1, boss=self._boss(1, settings), team_hp=100, team_max_hp=100, bosses_defeated=0, total_damage=0, combo=0, power_until=0),
                    session=dict(id=str(uuid.uuid4()), followers=0, gifts=0, likes=0, comments=0, participants=0), events=[], participants={}, ranking={}, known_gifts=[], pending=[], last_attack=self.clock(), last_combo=0, next_at=0, round_damage=0, next_special=self.clock()+30)

    def _v2_defaults(self):
        b=self.data['battle']
        for k,v in dict(like_power=0,power_charges=0,defense_until=0,shield=0,scene_bonus=False,rally_count=0,rally_complete=False,telegraph_until=0).items():b.setdefault(k,v)
        self.data.setdefault('rally_users',{})
        self.data.setdefault('cooldowns',{})
        self.data.setdefault('round_started',self.clock())
        self.data.setdefault('participation',{})

    @contextmanager
    def _transaction(self):
        previous = copy.deepcopy(self.data)
        try:
            with self.store.transaction():
                yield
                self._save()
        except BaseException:
            self.data = previous
            raise

    def _save(self):
        self.store.set('state', self.data)
        self.store.set('settings', self.data['settings'])

    def _log(self, message, event_type='system', source='system', name='Sistema', **extra):
        entry = dict(id=str(uuid.uuid4()), timestamp=self.clock(), type=event_type, source=source, name=clean_text(name), message=clean_text(message, 500), amount=0)
        entry.update(extra)
        self.data['events'].insert(0, entry)
        del self.data['events'][100:]

    def notify(self, message, event_type='system', source='system', name='Sistema', **extra):
        with self._transaction(): self._log(message, event_type, source, name, **extra)

    def snapshot(self):
        result = copy.deepcopy({k:self.data[k] for k in ['mode', 'battle', 'session', 'events', 'known_gifts', 'settings']})
        reached = self.store.reached_goals(self.data['session']['id'])
        result['session']['goals'] = [dict(id=g['id'], target=g['target'], reached=g['id'] in reached) for g in self.data['settings']['follower_goals']]
        result['battle']['pending_actions'] = len(self.data['pending'])
        result['ranking'] = sorted(copy.deepcopy(list(self.data['ranking'].values())), key=lambda r:r['damage'], reverse=True)[:5]
        result['history'] = self.store.history()
        counts=self.data['session']
        result['metrics']={'unique_participants':counts['participants'],'free_interactions':counts['followers']+counts['likes']+counts['comments'],'gift_units':counts['gifts'],'participation':copy.deepcopy(self.data['participation']),'retention':None,'average_watch_time':None,'note':'Retenção e tempo de visualização indisponíveis; não são inferidos de curtidas.'}
        return result

    def set_mode(self, mode):
        if mode not in ('test', 'live'): raise ValueError('Modo inválido')
        with self._transaction():
            self.data = self._fresh(mode, self.data['settings'])
            self._v2_defaults()
            self.store.clear_session_rows(self.data['session']['id'])
            self._log('Nova sessão de teste.' if mode == 'test' else 'Nova sessão LIVE. Aguardando conexão real.')

    def update_settings(self, settings):
        validated = validate_settings(settings)
        with self._transaction():
            self.data['settings'] = validated
            self.data['next_special']=self.clock()+validated['special_interval']
            if self.data['battle']['status'] == 'idle': self.data['battle']['boss'] = self._boss(self.data['battle']['level'], validated)
            self._log('Configurações salvas. Vida e dificuldade aplicadas ao próximo chefe.')

    def control(self, action):
        if action not in ('start', 'pause', 'reset', 'next', 'boss', 'clear_ranking'): raise ValueError('Controle inválido')
        with self._transaction():
            b = self.data['battle']
            if action == 'start':
                if b['status'] in ('idle','defeat'):self.data['round_started']=self.clock()
                if b['boss']['hp'] <= 0:
                    self._next_level()
                if b['status'] == 'defeat':
                    b.update(team_hp=100, boss=self._boss(b['level'], self.data['settings']))
                    self.data['round_damage'] = 0
                b['telegraph_until']=0
                b['status'] = 'running'
                self.data['last_attack'] = self.clock()
                self._drain()
            elif action == 'pause':
                if b['status'] not in ('running','victory'): raise ValueError('Não há batalha em andamento para pausar.')
                b['telegraph_until']=0
                b['status'] = 'paused'
            elif action == 'reset':
                self.data['rally_users']={}
                b.update(rally_count=0,rally_complete=False,telegraph_until=0)
                # Reset round does not reset event identity, rewards, or session counters.
                b.update(status='idle', shield=0, defense_until=0, level=1, boss=self._boss(1,self.data['settings']), team_hp=100, combo=0, power_until=0)
                self.data['pending'] = []
                self.data['round_damage'] = 0
            elif action in ('next','boss'):
                self._next_level()
                if action == 'boss':
                    b['boss']['name'] = 'Titã — ' + b['boss']['name']
                    b['boss']['max_hp'] *= 2
                    b['boss']['hp'] = b['boss']['max_hp']
                self._drain()
            elif action == 'clear_ranking': self.data['ranking'] = {}
            self._log({'start':'Batalha iniciada.', 'pause':'Batalha pausada; novas ações ficam na fila.', 'reset':'Rodada reiniciada. Contadores e recompensas da sessão foram preservados.', 'next':'Próxima fase.', 'boss':'Chefe especial invocado.', 'clear_ranking':'Ranking limpo.'}[action])

    def _next_level(self):
        b = self.data['battle']
        b['level'] += 1
        b.update(status='running', boss=self._boss(b['level'], self.data['settings']), team_hp=min(100,b['team_hp']+15), combo=0)
        self.data['last_attack'] = self.clock()
        self.data['round_damage'] = 0
        self.data['round_started'] = self.clock()
        b['shield']=0
        b.update(rally_count=0,rally_complete=False,telegraph_until=0)
        self.data['rally_users']={}

    def handle_event(self, event):
        e = NormalizedEvent.model_validate(event).model_dump()
        expected = 'simulation' if self.mode == 'test' else 'tiktok'
        if e['source'] != expected: raise ValueError('Origem incompatível com o modo atual.')
        if self.data['battle']['status'] != 'running' and len(self.data['pending']) > 200:
            raise ValueError('Fila de ações pausadas cheia. Retome a batalha antes de enviar mais eventos.')
        with self._transaction():
            sid = self.data['session']['id']
            if not self.store.claim_event(sid, e['source'], e['event_id']): return False
            if e['type'] == 'follow' and not self.store.claim_follower(sid,e['source'],e['user_id']): return False
            self.data['participants'][e['user_id']] = dict(name=e['name'],avatar=e['avatar'])
            self.data['session']['participants'] = len(self.data['participants'])
            freq=self.data['participation'].setdefault(e['user_id'],{'name':e['name'],'events':0})
            freq['events']+=1
            if e['type'] == 'gift':
                if not any(g['gift_id'] == e['gift_id'] for g in self.data['known_gifts']):
                    self.data['known_gifts'].append(dict(gift_id=e['gift_id'],name=e['gift_name'] or e['gift_id']))
                    self.data['known_gifts'] = self.data['known_gifts'][-200:]
                delta = self.store.combo_delta(sid,e['source'],e['user_id'],e['gift_id'],e['combo_id'] or e['event_id'],e['repeat_count'])
                if delta <= 0: return False
                self.data['session']['gifts'] += delta
                rule = next((g for g in self.data['settings']['gift_rules'] if g['gift_id'] == e['gift_id']),None)
                self._log(f"Enviou {delta} × {e['gift_name'] or (rule['name'] if rule else e['gift_id'])}", 'gift', e['source'],e['name'],avatar=e['avatar'])
                if rule and rule['enabled'] and self._cooldown('gift:'+e['gift_id']+':'+e['user_id'],rule['cooldown_seconds']):
                    self._log(rule['message'].replace('{name}',e['name']),source=e['source'],name=e['name'])
                    self._action(dict(type='damage',amount=round(rule['damage']*rule['multiplier']*delta),enabled=True,animation=rule['animation'],sound=rule['sound']),e)
                elif not rule: self._log('Presente detectado sem regra: configure seu ID no painel.',source=e['source'],name=e['name'])
            elif e['type'] == 'follow':
                self.data['session']['followers'] += 1
                self._log('Começou a seguir. Boas-vindas à equipe!', 'follow',e['source'],e['name'],avatar=e['avatar'])
                self._action(self.data['settings']['follow_action'],e)
                for goal in sorted(self.data['settings']['follower_goals'],key=lambda g:g['target']):
                    if self.data['session']['followers'] >= goal['target'] and self.store.claim_goal(sid,goal['id']):
                        self._log(f"Meta de {goal['target']} novos seguidores alcançada!",'goal',e['source'],'Equipe',sound='victory',animation='burst')
                        self._action(goal['action'],{**e,'user_id':'collective','name':'Equipe'})
            elif e['type'] == 'like':
                self.data['session']['likes'] += e['like_count']
                self._log(f"Enviou {e['like_count']} curtidas",'like',e['source'],e['name'])
                self.data['battle']['like_power']+=e['like_count']
                while self.data['battle']['like_power']>=self.data['settings']['likes_goal']:
                    self.data['battle']['like_power']-=self.data['settings']['likes_goal']
                    self.data['battle']['power_charges']=min(5,self.data['battle']['power_charges']+1)
                    self._log('Curtidas carregaram um ataque coletivo! !poder pode usar uma carga extra.','goal',e['source'],'Equipe')
                    self._action(dict(enabled=True,type='damage',amount=self.data['settings']['likes_reward_damage'],animation='burst',sound='power'),{**e,'user_id':'collective','name':'Equipe'})
                self._action(dict(enabled=True,type='damage',amount=e['like_count']*self.data['settings']['like_damage'],animation='spark',sound='hit'),e)
            elif e['type'] == 'comment':
                self.data['session']['comments'] += 1
                self._log(e['text'],'comment',e['source'],e['name'])
                command=e['text'].lower().strip()
                if command in ('!atacar','!attack','!curar','!defender','!poder') and self._cooldown('comment:'+e['user_id'],self.data['settings']['comment_cooldown']):
                    if command=='!curar':
                        self._action(dict(enabled=True,type='heal',amount=self.data['settings']['heal_amount'],animation='heal',sound='heal'),e)
                    elif command=='!defender':
                        self._action(dict(enabled=True,type='defend',amount=self.data['settings']['defense_seconds'],animation='power',sound='power'),e)
                    elif command=='!poder':
                        if self.data['battle']['power_charges']>0:
                            self.data['battle']['power_charges']-=1
                            self._action(dict(enabled=True,type='damage',amount=self.data['settings']['likes_reward_damage'],animation='legendary',sound='power'),e)
                        else:self._log('Sem carga. A equipe pode carregar poder com curtidas gratuitas.',source=e['source'],name=e['name'])
                    else:self._action(dict(enabled=True,type='damage',amount=self.data['settings']['comment_damage'],animation='slash',sound='hit'),e)
            if e['type']!='gift':self._rally(e)
            return True

    def _rally(self,e):
        b=self.data['battle'];s=self.data['settings']
        if not s['rally_enabled'] or b['rally_complete'] or b['status'] in ('victory','defeat'):return
        self.data['rally_users'][e['user_id']]=True
        b['rally_count']=len(self.data['rally_users'])
        if b['rally_count']>=s['rally_target']:
            b['rally_complete']=True
            self._log('União da equipe! Pessoas diferentes colaboraram sem presentes. Recompensa: golpe coletivo e 12 de cura.','rally',e['source'],'Comunidade',animation='burst',sound='victory')
            team={**e,'user_id':'collective','name':'Comunidade'}
            self._action(dict(enabled=True,type='damage',amount=s['rally_damage'],animation='burst',sound='power'),team)
            self._action(dict(enabled=True,type='heal',amount=12,animation='heal',sound='heal'),team)

    def _cooldown(self,key,seconds):
        now=self.clock()
        if self.data['cooldowns'].get(key,0)>now:return False
        self.data['cooldowns'][key]=now+seconds
        return True

    def _action(self, action, user):
        if not action['enabled'] or action['amount'] <= 0: return
        if self.data['battle']['status'] != 'running':
            if len(self.data['pending']) >= 256: raise ValueError('Fila de ações cheia')
            self.data['pending'].append(dict(action=copy.deepcopy(action),user=copy.deepcopy(user)))
            return
        b = self.data['battle']; now = self.clock()
        if action['type']=='defend':
            b['defense_until']=now+action['amount']
            self._log('Defesa ativa: ataques do chefe causam metade do dano durante a duração indicada.','power',user['source'],user['name'],sound='power',animation='power')
        elif action['type']=='scene':
            b['scene_bonus']=True
            self._log('Novo cenário desbloqueado pela comunidade!','scene',user['source'],user['name'],animation='burst',sound='victory')
        elif action['type'] == 'power':
            b['power_until'] = min(now+120, max(now,b['power_until'])+action['amount'])
            self._log('Poder coletivo: dano em dobro!', 'power',user['source'],user['name'],sound=action['sound'],animation=action['animation'],amount=action['amount'])
        elif action['type'] == 'heal':
            healed = min(action['amount'],b['team_max_hp']-b['team_hp'])
            b['team_hp'] += healed
            self._log('Recuperou a vida da equipe.', 'heal',user['source'],user['name'],amount=healed,sound=action['sound'],animation=action['animation'])
        else:
            damage = min(b['boss']['hp']+b['shield'],action['amount']*(2 if b['power_until']>now else 1))
            blocked=min(b['shield'],damage);b['shield']-=blocked
            b['boss']['hp'] -= damage-blocked; b['total_damage'] += damage; self.data['round_damage'] += damage
            b['combo'] = min(999,b['combo']+1) if now-self.data['last_combo'] <= 5 else 1
            self.data['last_combo'] = now
            rank = self.data['ranking'].setdefault(user['user_id'],dict(user_id=user['user_id'],name=user['name'],avatar=user.get('avatar'),damage=0))
            rank['damage'] += damage
            self._log('Atacou o chefe.', 'attack',user['source'],user['name'],amount=damage,avatar=user.get('avatar'),sound=action['sound'],animation=action['animation'])
            if b['boss']['hp'] <= 0:
                b['status'] = 'victory'; b['bosses_defeated'] += 1
                self.data['next_at'] = now+self.data['settings']['transition_seconds']
                self.store.add_history(dict(level=b['level'],boss=b['boss']['name'],damage=self.data['round_damage'],result='victory',timestamp=now,mode=self.mode,duration_seconds=max(0,now-self.data['round_started'])))
                self._log('Chefe derrotado! A próxima fase está chegando.', 'victory',sound='victory',animation='burst')

    def _drain(self):
        while self.data['pending'] and self.data['battle']['status'] == 'running':
            item = self.data['pending'].pop(0)
            self._action(item['action'],item['user'])

    def tick(self):
        b = self.data['battle']; now = self.clock()
        if b['status'] == 'victory' and now>=self.data['next_at']:
            with self._transaction(): self._next_level(); self._drain()
        elif b['status'] == 'running':
            warn=self.data['settings']['telegraph_enabled'] and not b['telegraph_until'] and 0 < self.data['settings']['boss_attack_interval']-(now-self.data['last_attack']) <= min(3,self.data['settings']['boss_attack_interval']/2)
            attack = now-self.data['last_attack']>=self.data['settings']['boss_attack_interval']
            special = self.data['settings']['dynamic_events'] and now>=self.data['next_special']
            combo_ended = b['combo']>0 and now-self.data['last_combo']>5
            defense_expired=b['defense_until']>0 and now>=b['defense_until']
            power_expired = b['power_until']>0 and now>=b['power_until']
            if not (attack or special or combo_ended or power_expired or defense_expired or warn): return
            with self._transaction():
                if warn:
                    b['telegraph_until']=self.data['last_attack']+self.data['settings']['boss_attack_interval']
                    self._log('Ataque do chefe anunciado. !defender reduz o dano; !curar recupera a equipe.','warning',animation='none',sound='none')
                if combo_ended: b['combo']=0
                if power_expired: b['power_until']=0
                if defense_expired:b['defense_until']=0
                if attack:
                    b['telegraph_until']=0
                    self.data['last_attack']=now
                    raw=self.data['settings']['boss_attack_damage']
                    if b['boss']['kind']=='dragon' and b['boss']['hp']<b['boss']['max_hp']/2:raw=round(raw*1.5)
                    if b['boss']['kind']=='specter':raw=max(1,round(raw*.75)) if raw else 0
                    dealt=round(raw*.5) if b['defense_until']>now else raw
                    b['team_hp']=max(0,b['team_hp']-dealt)
                    self._log('O chefe atacou a equipe.', 'boss_attack',amount=dealt)
                    if b['team_hp']<=0:
                        b['status']='defeat'
                        self.store.add_history(dict(level=b['level'],boss=b['boss']['name'],damage=self.data['round_damage'],result='defeat',timestamp=now,mode=self.mode,duration_seconds=max(0,now-self.data['round_started'])))
                        self._log('Equipe derrotada. Inicie novamente para tentar outra vez.', 'defeat',sound='critical')
                if special and b['status']=='running':
                    # A deterministic seed from the session gives reproducible, varied events.
                    choice = (uuid.UUID(self.data['session']['id']).int + int(now//30))%2
                    self.data['next_special']=now+self.data['settings']['special_interval']
                    if b['boss']['kind']=='golem':
                        b['shield']=min(100,b['shield']+50)
                        self._log('Escudo mágico: 50 pontos. Qualquer ataque, inclusive gratuito, quebra a proteção.','system')
                    elif b['boss']['kind']=='dragon':
                        self._log('Fúria: abaixo de metade da vida, o dragão causa 50% mais dano. !defender reduz o impacto.','system')
                    else:
                        self._log('Fase bônus gratuita: a equipe recebeu cura ou poder.','system')
                    self._action(dict(enabled=True,type='power' if choice else 'heal',amount=8 if choice else 12,animation='power',sound='power'),dict(source='system',name='Evento especial',user_id='collective'))
