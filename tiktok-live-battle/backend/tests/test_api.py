import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from battle.api import create_app

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory();self.app=create_app(self.directory.name);self.client=TestClient(self.app);self.client.__enter__()
    def tearDown(self):self.client.__exit__(None,None,None);self.directory.cleanup()
    def post(self,path,data):return self.client.post('/api/'+path,json=data)
    def test_health_and_initial_snapshot(self):
        self.assertEqual(self.client.get('/api/health').status_code,200)
        state=self.client.get('/api/state').json();self.assertEqual(state['mode'],'test');self.assertEqual(state['session']['followers'],0)
    def test_websocket_initial_and_updates(self):
        with self.client.websocket_connect('/ws') as ws:
            self.assertEqual(ws.receive_json()['type'],'state')
            self.post('control',{'action':'start'})
            for _ in range(3):
                packet=ws.receive_json()
                if packet['data']['battle']['status']=='running':break
            self.assertEqual(packet['data']['battle']['status'],'running')
    def test_follow_event_parallel_replays_one_reward(self):
        self.post('control',{'action':'start'})
        event=dict(type='follow',user_id='u1',name='Luna',event_id='follow-1')
        with ThreadPoolExecutor(max_workers=8) as pool:
            responses=list(pool.map(lambda _:self.post('simulate',event),range(12)))
        self.assertTrue(all(r.status_code==200 for r in responses))
        s=self.client.get('/api/state').json();self.assertEqual(s['session']['followers'],1);self.assertEqual(s['battle']['total_damage'],100)
    def test_modes_guard_and_simulation_forbidden_live(self):
        self.assertEqual(self.post('connection',{'action':'connect','username':'test'}).status_code,409)
        self.post('session',{'mode':'live'})
        self.assertEqual(self.post('simulate',{'type':'follow'}).status_code,400)
        self.assertEqual(self.post('connection',{'action':'connect','username':'not/a/profile'}).status_code,400)
    def test_origin_and_dns_rebinding_rejected(self):
        self.assertEqual(self.client.post('/api/control',json={'action':'start'},headers={'Origin':'https://evil.example'}).status_code,403)
        self.assertEqual(self.client.get('/api/state',headers={'Host':'evil.example'}).status_code,400)
    def test_settings_validation_and_export(self):
        s=self.client.get('/api/state').json()['settings'];s['follow_action']['type']='heal';s['follow_action']['amount']=30
        self.assertEqual(self.client.put('/api/settings',json=s).status_code,200)
        self.assertEqual(self.client.get('/api/settings/export').json()['follow_action']['type'],'heal')
        s['monster_hp']=-1;self.assertEqual(self.client.put('/api/settings',json=s).status_code,400)
    def test_no_mass_inferred_follow_event(self):
        self.assertEqual(self.post('simulate',{'type':'follow','follow_count':999}).status_code,422)
        self.assertEqual(self.client.get('/api/state').json()['session']['followers'],0)
    def test_unknown_control_invalid_limits(self):
        self.assertEqual(self.post('control',{'action':'surprise'}).status_code,422)
        self.assertEqual(self.post('simulate',{'type':'gift','repeat_count':-1}).status_code,422)
    def test_config_persisted_after_server_restart(self):
        data=self.client.get('/api/state').json()['settings'];data['like_damage']=3
        self.client.put('/api/settings',json=data);self.client.__exit__(None,None,None)
        self.app=create_app(self.directory.name);self.client=TestClient(self.app);self.client.__enter__()
        self.assertEqual(self.client.get('/api/state').json()['settings']['like_damage'],3)

if __name__=='__main__':unittest.main()
