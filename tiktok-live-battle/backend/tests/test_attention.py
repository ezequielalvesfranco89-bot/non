import unittest
import test_engine as fixtures
from battle.engine import Engine

class AttentionTests(unittest.TestCase):
    setUp=fixtures.EngineTests.setUp
    tearDown=fixtures.EngineTests.tearDown
    event=fixtures.EngineTests.event
    snap=fixtures.EngineTests.snap
    def enable(self):
        settings=self.snap()['settings'];settings['rally_enabled']=True;self.e.update_settings(settings)
    def test_four_unique_free_participants_award_once(self):
        self.enable()
        for i in range(4):self.e.handle_event(self.event('comment',user=str(i),text='Olá equipe'))
        self.assertTrue(self.snap()['battle']['rally_complete'])
        self.assertEqual(self.snap()['battle']['total_damage'],180)
        for i in range(5):self.e.handle_event(self.event('comment',user=str(i),text='Oi'))
        self.assertEqual(self.snap()['battle']['total_damage'],180)
    def test_same_user_and_duplicate_events_cannot_fill_rally(self):
        self.enable();e=self.event('like',like_count=1)
        self.e.handle_event(e);self.e.handle_event(e)
        for _ in range(5):self.e.handle_event(self.event('comment',text='Oi'))
        self.assertEqual(self.snap()['battle']['rally_count'],1)
    def test_gifts_do_not_buy_rally_progress(self):
        self.enable()
        for i in range(4):self.e.handle_event(self.event('gift',user=str(i),gift_id='demo-rose'))
        self.assertEqual(self.snap()['battle']['rally_count'],0)
    def test_rally_survives_restart_and_resets_per_round(self):
        self.enable()
        for i in range(3):self.e.handle_event(self.event('comment',user=str(i),text='Olá'))
        self.e=Engine(self.store,self.clock);self.e.control('start')
        self.e.handle_event(self.event('comment',user='3',text='Olá'))
        self.assertEqual(self.snap()['battle']['total_damage'],180)
        self.e.control('next');self.assertEqual(self.snap()['battle']['rally_count'],0)
    def test_warning_is_real_once_then_cleared_on_attack(self):
        self.clock.advance(9);self.e.tick();self.e.tick()
        self.assertEqual(sum(e['type']=='warning' for e in self.snap()['events']),1)
        self.assertEqual(self.snap()['battle']['telegraph_until'],1012)
        self.e.handle_event(self.event('comment',text='!defender'))
        self.clock.advance(3);self.e.tick()
        self.assertEqual(self.snap()['battle']['team_hp'],96)
        self.assertEqual(self.snap()['battle']['telegraph_until'],0)
    def test_warning_can_be_disabled_and_pause_resets_it(self):
        s=self.snap()['settings'];s['telegraph_enabled']=False;self.e.update_settings(s)
        self.clock.advance(9);self.e.tick();self.assertEqual(self.snap()['battle']['telegraph_until'],0)
        s['telegraph_enabled']=True;self.e.update_settings(s);self.e.tick();self.e.control('pause')
        self.assertEqual(self.snap()['battle']['telegraph_until'],0)
    def test_music_settings_validate_and_persist(self):
        s=self.snap()['settings'];s.update(music_style='ambient',music_volume=.1);self.e.update_settings(s)
        self.e=Engine(self.store,self.clock);self.assertEqual(self.snap()['settings']['music_volume'],.1)
        s['music_volume']=4
        with self.assertRaises(ValueError):self.e.update_settings(s)
