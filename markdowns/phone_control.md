# Aura phone control (Android)

The birthday page remains at `/`. Open `/control` in **Chrome on Android** to pair an ESP32-C3 SuperMini and control Aura. The site must be served over HTTPS (or `localhost` while developing) for Web Bluetooth and phone microphone access. The static website does not contain an OpenAI key. The phone records speech; the backend runs transcription, AI, and speech synthesis; the C3 downloads the resulting speech and plays it on Aura's speaker.

## First setup

1. Power Aura and hold its touch pad for 3 seconds to open the two-minute provisioning window. Enable Bluetooth on the phone and open the control page in Android Chrome. Tap **Pair Aura by Bluetooth**. If Android asks for a pairing code, read it from Aura's screen. Keep the phone near Aura while using the controls.
2. Deploy the backend at a URL reachable by both the phone and Aura. For a publicly hosted HTTPS website, use a publicly reachable HTTPS backend. Configure the backend's `AURA_DEVICE_TOKEN` and CORS origin to match the deployed website. Build Aura firmware with the backend server's TLS CA certificate so the C3 can verify its HTTPS connection.
3. Enter the backend base URL and device token on the phone. Hold Aura's touch pad for 3 seconds to open its two-minute provisioning window, then tap **Save to Aura**. The C3 keeps this configuration in nonvolatile storage. The control page remembers only the URL in the phone's local storage; the token is held in memory until the page closes.
4. Hold the touch pad for 3 seconds again, then enter the recipient's 2.4 GHz Wi-Fi name and password and tap **Send network to Aura**. Repeat when Aura moves to a different home or hotspot. The C3 saves the new network details, so no USB cable or source-code edit is needed. A phone hotspot works if the C3 can connect to it. Cellular data on the phone by itself does not give the C3 internet access.
5. Tap an eye expression or **Talk to Aura**. Phrases such as “look left,” “look right,” “blink,” “be happy,” and “be sad” also trigger an eye expression before Aura speaks. Phone voice input is limited to 20 seconds per request. Aura must have a working Wi-Fi or hotspot connection to fetch and play the reply. The phone page needs to remain open for voice capture and commands.

## Protocol

- BLE service: `2c7f0001-2530-4d35-8fbc-a99878fe0001`
- Write characteristic: `2c7f0002-2530-4d35-8fbc-a99878fe0001`
- Status/read characteristic: `2c7f0003-2530-4d35-8fbc-a99878fe0001`
- Commands are UTF-8 JSON with a trailing newline, written sequentially in chunks of at most 20 bytes. Maximum frame length is 512 bytes.
- Examples: `{"type":"expression","name":"happy"}`, `{"type":"wifi","ssid":"...","password":"..."}`, `{"type":"config","backend_url":"https://...","device_token":"..."}`, and `{"type":"play","job_id":"32 lowercase hex characters"}`.
- Phone sends raw 16 kHz mono PCM16LE in `POST /v1/phone-voice` with `Content-Type: application/octet-stream` and `X-Device-Token`. The backend returns `{job_id, transcript, reply}`. After `play`, the C3 fetches `GET /v1/audio-jobs/{job_id}/audio` with the same token; the response is raw 16 kHz mono PCM16LE.

## Limits

- Web Bluetooth is supported by Chrome on Android, but not by all browsers. Chrome requires a user gesture to pair and browser permission for microphone access.
- Bluetooth is the control and provisioning link. It does not carry the generated voice audio. The C3 needs 2.4 GHz Wi-Fi for playback, and the backend must be reachable from its network. The phone may use any working internet connection for its own request.
- Wi-Fi and audio service credentials are sent to Aura only during the touch-initiated provisioning window. Treat the device token as private; do not embed it in the static site's source or commit it to the repository.
- This flow has a browser build check, but final pairing, Wi-Fi provisioning, and speaker playback require the physical C3, display, and amplifier to verify.
