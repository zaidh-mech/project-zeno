# Phone voice bridge for ESP32-C3

The Android browser records the user's microphone. The bridge transcribes it, creates Aura's text reply, synthesizes speech, and stores a short-lived raw PCM playback job. The browser sends `play:<job_id>` over BLE after the POST succeeds. The C3 then downloads the audio over its current Wi-Fi connection and plays it through its I2S amplifier.

## HTTP contract

All requests include `X-Device-Token: <AURA_DEVICE_TOKEN>`. The browser must reach the backend using HTTPS when the page is served by HTTPS; microphone and Web Bluetooth also require a secure browser context. The OpenAI key stays on the backend and is never sent to the phone page or C3.

| Route | Request | Success |
|---|---|---|
| `POST /v1/phone-voice` | `Content-Type: application/octet-stream`; body is headerless PCM16LE, mono, 16,000 Hz, 100 ms to 40 s | JSON `{"job_id":"32-lowercase-hex-characters","transcript":"...","reply":"..."}` |
| `GET /v1/audio-jobs/{job_id}/audio` | No body | `application/octet-stream` containing headerless PCM16LE, mono, 16,000 Hz; `X-Audio-Format: pcm_s16le; rate=16000; channels=1` |

The GET returns 404 for an unknown, evicted, or expired job. Jobs are kept in process memory for up to five minutes, with at most four jobs and 1.28 MB of audio per job. Restarting the backend clears them. Run one backend worker for this version; multiple workers need shared storage so the POST and C3 GET see the same job. Existing `/v1/voice` and `/v1/text` routes are unchanged.

Set `AURA_WEB_ORIGIN` to the exact origin of the deployed static page, such as `https://gift.example`, so its cross-origin browser POST passes CORS preflight. A comma-separated `AURA_ALLOWED_ORIGINS` is also supported for multiple web origins. The default allows no cross-origin browser calls. Set `AURA_DEVICE_TOKEN` to a long random value and provision the same value into the phone UI and C3. Since the phone page sends this token, treat it as a device access credential, not as the OpenAI key.

The C3 needs an internet connection to fetch audio. It can use the recipient's home Wi-Fi or an Android phone hotspot; the BLE link alone carries control messages, not audio. Wi-Fi credentials must be provisioned at runtime, so gifting the device never requires changing and reflashing an SSID in source code.
