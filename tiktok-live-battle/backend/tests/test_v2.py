import test_engine as fixtures
import unittest

class V2Tests(unittest.TestCase):
    setUp=fixtures.EngineTests.setUp
    tearDown=fixtures.EngineTests.tearDown
    event=fixtures.EngineTests.event
    snap=fixtures.EngineTests.snap
    # Reuse the fixture, not all inherited cases.
    def test_free_likes_charge_and_power(self):
        self.e.handle_event(self.event('like',like_count=100))
        self.assertEqual(self.snap()['battle']['total_damage'],400)
        self.assertEqual(self.snap()['battle']['power_charges'],1)
        self.e.handle_event(self.event('comment',text='!poder'))
        self.assertEqual(self.snap()['battle']['total_damage'],700)
        self.assertEqual(self.snap()['session']['gifts'],0)
    def test_comment_rate_limit_and_expiry(self):
        for _ in range(4):self.e.handle_event(self.event('comment',text='!atacar'))
        self.assertEqual(self.snap()['battle']['total_damage'],15)
        self.clock.advance(3);self.e.handle_event(self.event('comment',text='!atacar'))
        self.assertEqual(self.snap()['battle']['total_damage'],30)
    def test_defense_reduces_boss_damage(self):
        self.clock.advance(10);self.e.handle_event(self.event('comment',text='!defender'))
        self.clock.advance(2);self.e.tick()
        self.assertEqual(self.snap()['battle']['team_hp'],96)
    def test_cure_does_not_heal_boss(self):
        self.clock.advance(12);self.e.tick();self.e.handle_event(self.event('comment',text='!curar'))
        self.assertEqual(self.snap()['battle']['team_hp'],100)
        self.assertEqual(self.snap()['battle']['boss']['hp'],1500)
    def test_gift_cooldown_is_configurable(self):
        s=self.snap()['settings'];s['gift_rules'][0]['cooldown_seconds']=4.0;self.e.update_settings(s)
        for _ in range(2):self.e.handle_event(self.event('gift',gift_id='demo-rose'))
        self.assertEqual(self.snap()['battle']['total_damage'],35)
        self.clock.advance(4);self.e.handle_event(self.event('gift',gift_id='demo-rose'))
        self.assertEqual(self.snap()['battle']['total_damage'],70)
    def test_scene_action_available_to_goal(self):
        s=self.snap()['settings'];s['follower_goals'][0]['target']=1;s['follower_goals'][0]['action']['type']='scene';self.e.update_settings(s)
        self.e.handle_event(self.event());self.assertTrue(self.snap()['battle']['scene_bonus'])
    def test_difficulty_ceiling_supports_free_progress(self):
        for _ in range(40):self.e.control('next')
        self.assertLessEqual(self.snap()['battle']['boss']['max_hp'],4500)
    def test_analytics_do_not_invent_retention(self):
        self.e.handle_event(self.event());m=self.snap()['metrics']
        self.assertEqual(m['free_interactions'],1);self.assertIsNone(m['retention']);self.assertIsNone(m['average_watch_time'])

