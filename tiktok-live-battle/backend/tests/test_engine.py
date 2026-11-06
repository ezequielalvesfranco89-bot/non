import unittest
from battle.engine import Engine
from battle.storage import Store

class Clock:
    def __init__(self): self.now=1000.0
    def __call__(self): return self.now
    def advance(self,s): self.now+=s

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.store=Store(':memory:');self.clock=Clock();self.e=Engine(self.store,self.clock);self.e.control('start');self.n=0
        settings=self.e.snapshot()['settings'];settings['rally_enabled']=False;self.e.update_settings(settings)
    def tearDown(self):self.store.close()
    def event(self,kind='follow',user='alice',**kw):
        self.n+=1
        return dict(type=kind,event_id=f'e{self.n}',source='simulation',user_id=user,name=user,**kw)
    def snap(self):return self.e.snapshot()
    def test_follow_unique_user_and_message(self):
        e=self.event();self.e.handle_event(e);self.e.handle_event(e);self.e.handle_event(self.event())
        self.assertEqual(self.snap()['session']['followers'],1);self.assertEqual(self.snap()['battle']['total_damage'],100)
        self.assertEqual(sum(e['type']=='follow' for e in self.snap()['events']),1)
    def test_combo_cumulative_positive_deltas_only(self):
        for count in [1,2,2,1,3]:self.e.handle_event(self.event('gift',gift_id='demo-rose',combo_id='one',repeat_count=count))
        self.assertEqual(self.snap()['session']['gifts'],3);self.assertEqual(self.snap()['battle']['total_damage'],105)
    def test_combos_independent_by_user_gift_group(self):
        for user,group in [('alice','x'),('bob','x'),('alice','y')]:self.e.handle_event(self.event('gift',user=user,gift_id='demo-rose',combo_id=group,repeat_count=2))
        self.assertEqual(self.snap()['session']['gifts'],6)
    def test_gift_replay_event_exactly_once(self):
        e=self.event('gift',gift_id='demo-rose',repeat_count=2);self.e.handle_event(e);self.e.handle_event(e)
        self.assertEqual(self.snap()['battle']['total_damage'],70)
    def test_unknown_id_no_name_matching(self):
        self.e.handle_event(self.event('gift',gift_id='unknown',gift_name='Rosa (teste)'))
        self.assertEqual(self.snap()['battle']['total_damage'],0);self.assertEqual(self.snap()['known_gifts'][0]['gift_id'],'unknown')
    def test_disabled_gift_counted_without_damage(self):
        s=self.snap()['settings'];s['gift_rules'][0]['enabled']=False;self.e.update_settings(s)
        self.e.handle_event(self.event('gift',gift_id='demo-rose'));self.assertEqual(self.snap()['session']['gifts'],1);self.assertEqual(self.snap()['battle']['total_damage'],0)
    def test_ranking_caps_overkill(self):
        self.e.handle_event(self.event('gift',gift_id='demo-legendary',repeat_count=100))
        self.assertEqual(self.snap()['ranking'][0]['damage'],1500);self.assertEqual(self.snap()['battle']['total_damage'],1500)
    def test_paused_reward_saved_and_applied_once(self):
        self.e.control('pause');self.e.handle_event(self.event());self.assertEqual(self.snap()['battle']['total_damage'],0)
        self.assertEqual(self.snap()['session']['followers'],1);self.assertEqual(self.snap()['battle']['pending_actions'],1)
        self.e.control('start');self.e.control('start');self.assertEqual(self.snap()['battle']['total_damage'],100)
    def test_paused_action_survives_restart(self):
        self.e.control('pause');event=self.event();self.e.handle_event(event);self.e=Engine(self.store,self.clock)
        self.e.handle_event(event);self.e.control('start');self.assertEqual(self.snap()['battle']['total_damage'],100)
    def test_goals_exactly_once_across_restart(self):
        for i in range(5):self.e.handle_event(self.event(user=str(i)))
        self.assertEqual(self.snap()['battle']['total_damage'],1000)
        self.e=Engine(self.store,self.clock);self.e.control('start');self.e.handle_event(self.event(user='0'))
        self.assertEqual(self.snap()['battle']['total_damage'],1000);self.assertTrue(self.snap()['session']['goals'][0]['reached'])
    def test_edit_goal_does_not_reaward_same_id(self):
        for i in range(5):self.e.handle_event(self.event(user=str(i)))
        s=self.snap()['settings'];s['follower_goals'][0]['action']['amount']=10000;self.e.update_settings(s)
        self.e.handle_event(self.event(user='extra'));self.assertEqual(self.snap()['battle']['total_damage'],1100)
    def test_follow_heals_team_but_not_boss(self):
        s=self.snap()['settings'];s['follow_action'].update(type='heal',amount=30);self.e.update_settings(s)
        self.clock.advance(12);self.e.tick();self.assertEqual(self.snap()['battle']['team_hp'],92)
        self.e.handle_event(self.event());self.assertEqual(self.snap()['battle']['team_hp'],100);self.assertEqual(self.snap()['battle']['boss']['hp'],1500)
    def test_power_doubles_until_expiry(self):
        s=self.snap()['settings'];s['follow_action'].update(type='power',amount=3);self.e.update_settings(s)
        self.e.handle_event(self.event());self.e.handle_event(self.event('gift',gift_id='demo-rose'))
        self.clock.advance(4);self.e.tick();self.assertEqual(self.snap()['battle']['power_until'],0);self.e.handle_event(self.event('gift',gift_id='demo-rose'))
        self.assertEqual(self.snap()['battle']['total_damage'],105)
    def test_settings_invalid_are_atomic(self):
        s=self.snap()['settings'];s['gift_rules'][1]['gift_id']='demo-rose'
        with self.assertRaises(ValueError):self.e.update_settings(s)
        self.assertEqual(self.snap()['settings']['gift_rules'][1]['gift_id'],'demo-strong')
    def test_invalid_event_not_marked_seen(self):
        e=self.event();e['source']='tiktok'
        with self.assertRaises(ValueError):self.e.handle_event(e)
        e['source']='simulation';self.e.handle_event(e);self.assertEqual(self.snap()['session']['followers'],1)
    def test_modes_do_not_mix_and_start_new_session(self):
        self.e.handle_event(self.event());old=self.snap()['session']['id'];self.e.set_mode('live')
        self.assertNotEqual(old,self.snap()['session']['id']);self.assertEqual(self.snap()['session']['followers'],0)
        with self.assertRaises(ValueError):self.e.handle_event(self.event())
        e=self.event();e['source']='tiktok';self.e.handle_event(e);self.assertEqual(self.snap()['session']['followers'],1)
    def test_victory_progression_and_history(self):
        self.e.handle_event(self.event('gift',gift_id='demo-legendary',repeat_count=10));self.assertEqual(self.snap()['battle']['status'],'victory')
        self.assertEqual(self.snap()['history'][0]['result'],'victory');self.clock.advance(3);self.e.tick()
        self.assertEqual(self.snap()['battle']['level'],2);self.assertEqual(self.snap()['battle']['boss']['max_hp'],1770)
    def test_start_from_victory_does_not_respawn_zero_hp(self):
        self.e.handle_event(self.event('gift',gift_id='demo-legendary',repeat_count=10));self.e.control('start');self.assertGreater(self.snap()['battle']['boss']['hp'],0)
    def test_defeat_once_and_retry(self):
        s=self.snap()['settings'];s.update(boss_attack_damage=100,boss_attack_interval=2.0);self.e.update_settings(s)
        self.clock.advance(2);self.e.tick();self.e.tick();self.assertEqual(self.snap()['battle']['status'],'defeat');self.assertEqual(len(self.snap()['history']),1)
        self.e.control('start');self.assertEqual(self.snap()['battle']['team_hp'],100)
    def test_comments_only_attack_command(self):
        self.e.handle_event(self.event('comment',text='hello'));self.e.handle_event(self.event('comment',text='!atacar'))
        self.assertEqual(self.snap()['battle']['total_damage'],15);self.assertEqual(self.snap()['session']['comments'],2)
    def test_like_delta_not_total(self):
        self.e.handle_event(self.event('like',like_count=10));self.assertEqual(self.snap()['battle']['total_damage'],10)
    def test_log_plain_text_controls_stripped(self):
        event=self.event();event['name']='A\x00<script>';self.e.handle_event(event)
        self.assertEqual(next(e for e in self.snap()['events'] if e['type']=='follow')['name'],'A<script>')
    def test_bounded_paused_queue_rejects_without_reward(self):
        self.e.control('pause')
        for i in range(201):self.e.handle_event(self.event('gift',gift_id='demo-rose'))
        event=self.event(user='late')
        with self.assertRaises(ValueError):self.e.handle_event(event)
        self.assertEqual(self.snap()['session']['followers'],0);self.e.control('start');self.e.handle_event(event);self.assertEqual(self.snap()['session']['followers'],1)
    def test_reset_keeps_follow_reward_identity(self):
        self.e.handle_event(self.event());self.e.control('reset');self.e.handle_event(self.event());self.assertEqual(self.snap()['session']['followers'],1)
    def test_custom_boss_name_and_palette_persist(self):
        s=self.snap()['settings'];s['boss_names']['specter']='Sombra da Comunidade';s['appearance']='ocean';self.e.update_settings(s)
        self.e.control('next');self.assertEqual(self.snap()['battle']['boss']['name'],'Sombra da Comunidade')
        self.e=Engine(self.store,self.clock);self.assertEqual(self.snap()['settings']['appearance'],'ocean')
    def test_incomplete_boss_configuration_rejected(self):
        s=self.snap()['settings'];s['boss_names']={'golem':'Um chefe'}
        with self.assertRaises(ValueError):self.e.update_settings(s)
    def test_validation_rejects_nan_and_oversize_power(self):
        s=self.snap()['settings'];s['volume']=float('nan')
        with self.assertRaises(ValueError):self.e.update_settings(s)
        s=self.snap()['settings'];s['follow_action'].update(type='power',amount=121)
        with self.assertRaises(ValueError):self.e.update_settings(s)

if __name__=='__main__':unittest.main()
