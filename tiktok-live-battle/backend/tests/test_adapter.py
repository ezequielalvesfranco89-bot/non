import asyncio
import ssl
import unittest
from types import SimpleNamespace as NS
from battle.tiktok import TikTokAdapter

class AdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.emitted=[];self.status=[]
        async def emit(e):self.emitted.append(e)
        async def status(e):self.status.append(e)
        self.a=TikTokAdapter(emit,status)
    async def asyncTearDown(self):await self.a.disconnect()
    def event(self,**extra):
        return NS(user=NS(id=123,nickname='Luna',avatar_thumb=NS(url_list=['https://example.com/avatar.png'])),common=NS(msg_id=456,room_id=9),**extra)
    def test_follow_is_individual_and_does_not_use_count(self):
        event=self.event(follow_count=999999)
        e=self.a.normalize('follow',event,9);self.assertEqual(e['user_id'],'123');self.assertNotIn('follow_count',e);self.assertEqual(e['type'],'follow')
    def test_stable_follow_without_msgid(self):
        event=self.event();event.common.msg_id=0
        self.assertEqual(self.a.normalize('follow',event,9)['event_id'],'follow:9:123')
    def test_anonymous_follow_is_not_invented(self):
        event=self.event();event.user=None;self.assertIsNone(self.a.normalize('follow',event,9))
    def test_gift_combo_normalization(self):
        event=self.event(gift_id=10,gift=NS(id=10,name='Gift'),repeat_count=5,group_id=777,streaking=True)
        e=self.a.normalize('gift',event,9);self.assertEqual(e['combo_id'],'9:777');self.assertEqual(e['repeat_count'],5);self.assertEqual(e['gift_id'],'10')
    def test_no_group_intermediate_streak_ignored(self):
        event=self.event(gift_id=10,gift=NS(id=10,name='Gift'),repeat_count=2,group_id=0,streaking=True)
        self.assertIsNone(self.a.normalize('gift',event,9))
    def test_like_uses_batch_count_not_total(self):
        e=self.a.normalize('like',self.event(count=3,total=8888),9);self.assertEqual(e['like_count'],3)
    @unittest.skipUnless(TikTokAdapter(None,None).capabilities()['available'],'Integração opcional não instalada')
    async def test_actual_library_handlers_and_verified_ssl_transport(self):
        from TikTokLive.events import FollowEvent,GiftEvent
        self.a.username='fixture';self.a.client=self.a._create_client()
        follow_handlers=self.a.client.listeners(FollowEvent.get_type())
        self.assertEqual(len(follow_handlers),1);self.assertTrue(self.a.client.listeners(GiftEvent.get_type()))
        sdk=self.a.client.web.signer.sdk_client
        transport=sdk.get_async_httpx_client()._transport
        # Proxy transports are in mounts; direct transport still must verify.
        self.assertEqual(transport._pool._ssl_context.verify_mode,ssl.CERT_REQUIRED)
        self.a.client._room_id=9
        await follow_handlers[0](self.event(follow_count=1000));self.assertEqual(len(self.emitted),1);self.assertEqual(self.emitted[0]['type'],'follow')
    async def test_disconnect_does_not_cancel_other_server_tasks(self):
        from unittest.mock import AsyncMock
        self.a.username='fixture'
        client=NS(web=NS(close=AsyncMock()),disconnect=AsyncMock())
        async def start(**kwargs):return asyncio.create_task(asyncio.sleep(100))
        client.start=start
        self.a._create_client=lambda:client
        unrelated=asyncio.create_task(asyncio.sleep(100))
        self.a.task=asyncio.create_task(self.a._run())
        await asyncio.sleep(.01)
        await self.a.disconnect()
        self.assertFalse(unrelated.done())
        client.disconnect.assert_awaited_with(close_client=False)
        client.web.close.assert_awaited()
        unrelated.cancel()
        await asyncio.gather(unrelated,return_exceptions=True)

    async def test_invalid_username_rejected_without_connecting(self):
        with self.assertRaises(ValueError):await self.a.connect('https://evil.example/../../')
        self.assertIsNone(self.a.task)
    async def test_malformed_payload_no_reward(self):
        await self.a._event('follow',NS(user=None),NS(room_id=9));self.assertEqual(self.emitted,[])

if __name__=='__main__':unittest.main()
