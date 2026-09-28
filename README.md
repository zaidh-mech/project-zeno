# Aura

Aura is a birthday desk companion with animated eyes, touch, speaker replies, and a passive NFC tag that opens its companion website. The current compact design uses an **ESP32-C3 SuperMini and an Android phone**: the phone records speech and runs the control page; Aura displays expressions and speaks the reply. The earlier standalone ESP32-S3 design remains in the repository for reference. Physical assembly and fit checks are still required.

## Project files

| Area | Deliverables |
| --- | --- |
| Electronics | [C3 phone build and BOM](markdowns/c3_phone_hardware.md); [earlier S3 hardware](markdowns/hardware_bom_wiring.md) |
| Device | [C3 firmware](src/c3_main.cpp), [C3 setup](markdowns/c3_firmware.md), and [PlatformIO environments](platformio.ini); [earlier S3 firmware](src/main.cpp) |
| AI service | [Phone audio contract](markdowns/phone_backend.md), [personality](markdowns/ai_personality_backend.md), and [Python backend](backend/app.py) |
| Enclosure | [Compact C3 CAD specification](markdowns/c3_compact_cad_spec.md) and [OpenSCAD model](aura_c3_compact_enclosure.scad); [earlier S3 design](markdowns/cad_design_spec.md) |
| NFC portal and control | [Web app](web/), [Android control setup](markdowns/phone_control.md), [birthday page setup](markdowns/nfc_nextjs_app.md), and [gallery admin / GitHub Pages publishing](markdowns/memory_gallery.md) |

## Bring-up order

1. Buy or verify the C3, round display, touch module, amplifier, and speaker from the [compact BOM](markdowns/c3_phone_hardware.md). Power the first build by USB.
2. Configure and start the backend using `backend/.env.example` and [backend instructions](markdowns/ai_personality_backend.md). The OpenAI key stays on that server.
3. Add the deployed backend's public TLS root CA certificate to the ignored `include/firmware_config.h`, then build and upload `aura_esp32c3_phone` as described in [C3 setup](markdowns/c3_firmware.md). This trust anchor is a one-time maker setup; changing Wi-Fi later needs no code edit.
4. Personalize and deploy the [web app](web/) over HTTPS. Open `/control` on Android Chrome, hold the touch pad for three seconds, pair, and enter the recipient's Wi-Fi or hotspot credentials and service details. Write the website URL to an NFC sticker as an NDEF URI.
5. Measure the purchased modules, adjust and print the [compact enclosure](aura_c3_compact_enclosure.scad), and assemble after fit and electrical checks.

In the compact design, the Android browser sends recorded voice to the backend. The C3 receives short expression commands by Bluetooth and downloads reply audio over Wi-Fi for playback. The NFC sticker only opens the website and has no electrical connection to the C3. The original S3 firmware still sends its own microphone audio to `POST /v1/voice`.

## Prototype status

Both firmware targets compile with PlatformIO, the backend's local protocol tests pass, and the website typecheck and production build pass. The control page is available locally at `http://localhost:3000/control` after `cd web` and `npm run dev`; phone Bluetooth/microphone use requires HTTPS deployment (or localhost on that phone). The C3 model is USB-powered; the earlier S3 battery design does not fit it. Physical pairing, acoustics, display orientation, touch sensitivity, NFC range, Wi-Fi handoff, and a live AI/audio round trip are unverified until hardware testing.
