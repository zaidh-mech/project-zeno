"""Local protocol tests with an in-memory OpenAI substitute; no API key or network."""

import asyncio
import os
import struct
import unittest
from unittest.mock import patch

import httpx

import app as bridge


class BridgeTests(unittest.TestCase):
    def test_pcm_resampling_across_odd_chunks(self) -> None:
        converter = bridge.Pcm24To16()
        source = struct.pack("<5h", 0, 1000, 2000, 3000, 4000)
        output = converter.feed(source[:3]) + converter.feed(source[3:7]) + converter.feed(source[7:])
        self.assertEqual(struct.unpack("<3h", output), (0, 1500, 3000))

    def test_voice_turn_protocol(self) -> None:
        calls = []

        def upstream(request: httpx.Request) -> httpx.Response:
            calls.append(request.url.path)
            if request.url.path == "/v1/audio/transcriptions":
                # Multipart body contains a WAV file, not raw PCM.
                self.assertIn(b"RIFF", request.content)
                return httpx.Response(200, json={"text": "Hello Aura"})
            if request.url.path == "/v1/responses":
                self.assertIn(b"Hello Aura", request.content)
                return httpx.Response(200, json={"output": [{"content": [{"type": "output_text", "text": "Hi, sunshine!"}]}]})
            if request.url.path == "/v1/audio/speech":
                self.assertIn(b'"response_format":"pcm"', request.content)
                return httpx.Response(200, content=struct.pack("<5h", 0, 1000, 2000, 3000, 4000))
            return httpx.Response(404)

        real_client = httpx.AsyncClient

        def upstream_client(*args, **kwargs):
            return real_client(transport=httpx.MockTransport(upstream))

        async def run() -> None:
            async with real_client(transport=httpx.ASGITransport(app=bridge.app), base_url="http://test") as client:
                with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "AURA_DEVICE_TOKEN": "device-secret"}), patch.object(bridge.httpx, "AsyncClient", upstream_client):
                    unauthorized = await client.post("/v1/voice", headers={"content-type": "audio/pcm"}, content=b"\0" * 3200)
                    self.assertEqual(unauthorized.status_code, 401)
                    response = await client.post("/v1/voice", headers={"content-type": "audio/pcm", "x-device-token": "device-secret"}, content=b"\0" * 3200)
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.headers["content-type"], "audio/pcm")
                    self.assertEqual(response.content, struct.pack("<3h", 0, 1500, 3000))

        asyncio.run(run())
        self.assertEqual(calls, ["/v1/audio/transcriptions", "/v1/responses", "/v1/audio/speech"])

    def test_phone_voice_audio_job_and_auth(self) -> None:
        def upstream(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/v1/audio/transcriptions":
                return httpx.Response(200, json={"text": "Wave hello"})
            if request.url.path == "/v1/responses":
                return httpx.Response(200, json={"output": [{"content": [{"type": "output_text", "text": "Hello!"}]}]})
            if request.url.path == "/v1/audio/speech":
                return httpx.Response(200, content=struct.pack("<5h", 0, 1000, 2000, 3000, 4000))
            return httpx.Response(404)

        real_client = httpx.AsyncClient

        def upstream_client(*args, **kwargs):
            return real_client(transport=httpx.MockTransport(upstream))

        async def run() -> None:
            async with real_client(transport=httpx.ASGITransport(app=bridge.app), base_url="http://test") as client:
                with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "AURA_DEVICE_TOKEN": "device-secret"}), patch.object(bridge.httpx, "AsyncClient", upstream_client):
                    headers = {"Content-Type": "application/octet-stream", "X-Device-Token": "device-secret"}
                    posted = await client.post("/v1/phone-voice", headers=headers, content=b"\0" * 3200)
                    self.assertEqual(posted.status_code, 200, posted.text)
                    payload = posted.json()
                    self.assertEqual(payload["transcript"], "Wave hello")
                    self.assertEqual(payload["reply"], "Hello!")
                    self.assertRegex(payload["job_id"], r"^[0-9a-f]{32}$")
                    url = f"/v1/audio-jobs/{payload['job_id']}/audio"
                    unauthorized = await client.get(url)
                    self.assertEqual(unauthorized.status_code, 401)
                    fetched = await client.get(url, headers={"X-Device-Token": "device-secret"})
                    self.assertEqual(fetched.status_code, 200)
                    self.assertEqual(fetched.headers["x-audio-format"], "pcm_s16le; rate=16000; channels=1")
                    self.assertEqual(fetched.content, struct.pack("<3h", 0, 1500, 3000))

        asyncio.run(run())

    def test_audio_job_cache_is_bounded_and_expires(self) -> None:
        with bridge._audio_jobs_lock:
            bridge._audio_jobs.clear()
        with patch.object(bridge.time, "monotonic", return_value=1000):
            ids = [bridge.store_audio_job(b"\0\0") for _ in range(bridge.MAX_AUDIO_JOBS + 1)]
        with self.assertRaises(bridge.HTTPException) as evicted:
            bridge.get_audio_job(ids[0])
        self.assertEqual(evicted.exception.status_code, 404)
        with patch.object(bridge.time, "monotonic", return_value=1000 + bridge.AUDIO_JOB_TTL_SECONDS):
            with self.assertRaises(bridge.HTTPException) as expired:
                bridge.get_audio_job(ids[-1])
        self.assertEqual(expired.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
