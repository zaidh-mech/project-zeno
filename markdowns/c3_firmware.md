# ESP32-C3 SuperMini phone-first firmware

Build the separate target with `platformio run -e aura_esp32c3_phone`. It uses `src/c3_main.cpp`; the original S3 target keeps `src/main.cpp`. The C3 uses a 4 MB flash layout with a 3 MB app partition. Flash a real C3 SuperMini only after checking its printed pin labels and voltage rails against this wiring; the PlatformIO board profile is the compatible ESP32-C3 DevKitM-1 profile, not a guarantee that every SuperMini clone has the same pinout.

## Wiring for the USB-powered prototype

| Part | Part pin | C3 pin |
|---|---|---|
| GC9A01 1.28-inch LCD | SCLK | GPIO4 |
| LCD | MOSI/SDA | GPIO6 |
| LCD | CS | GPIO7 |
| LCD | DC | GPIO5 |
| LCD | RST | GPIO3 |
| LCD | BL | 3V3 (always on) |
| LCD | VCC, GND | 3V3, GND |
| TTP223 | OUT, VCC, GND | GPIO20, 3V3, GND |
| MAX98357A | BCLK | GPIO0 |
| MAX98357A | LRC/WS | GPIO1 |
| MAX98357A | DIN | GPIO10 |
| MAX98357A | SD/EN | high per amplifier module documentation |
| MAX98357A | VIN, GND | USB 5V/VBUS, GND |
| Small speaker | terminals | MAX98357A speaker outputs; **never** connect either terminal to GND |

Use a speaker rated for the amplifier and keep the firmware's 45% PCM output cap when trying a small 8-ohm speaker. The amplifier can still draw substantial peak current. Check the actual module voltage requirements before powering it. GPIO18/19 stay free for native USB; GPIO2/8/9 are boot-strapping pins and are unused here. GPIO20 is normally UART RX, which this build does not use. The display library reports that DMA is unavailable on C3, so full-screen animation may be less smooth than on S3.

There is no microphone on the C3. Android supplies the microphone and AI request. The device supplies the eye display, touch event, and voice output. The phone website needs to remain open for microphone input and Bluetooth control. Audio playback uses Wi-Fi, so Bluetooth alone is insufficient for voice output.

## First setup and changing networks

1. Power the device through USB. Hold the TTP223 touch surface for **3 seconds**. The display shows a six-digit pairing code and opens a **2-minute** setup window.
2. On Android Chrome, open the Aura website over HTTPS (localhost works during development), press Connect, and select **Aura Desk Buddy**. Enter or confirm the code if Android prompts for Bluetooth pairing.
3. In the site, enter the current **2.4 GHz** Wi-Fi SSID/password and the backend base URL/device token. The site sends these over BLE; the C3 saves them in ESP32 Preferences flash and reconnects automatically after power cycling. A phone hotspot is another suitable 2.4 GHz network, if that phone supports running hotspot and Bluetooth together.
4. On a new home's Wi-Fi or phone hotspot, hold touch for 3 seconds again and send the new credentials from the site. No code edit or USB reflashing is required to change Wi-Fi. The C3 retains one network at a time; it does not roam between a list of known networks.

Only setup commands (`wifi` and `config`) require the touch window. The BLE command characteristic requests authenticated encrypted pairing. The passkey is displayed on the buddy for initial pairing. The site must send each JSON command as UTF-8 plus a newline, in sequential BLE writes of at most 20 bytes. The firmware assembles up to 512 bytes before processing it. This chunking works even with the default small ATT MTU.

Bluetooth UUIDs:

- Service: `2c7f0001-2530-4d35-8fbc-a99878fe0001`
- Command write: `2c7f0002-2530-4d35-8fbc-a99878fe0001`
- Status read/notify: `2c7f0003-2530-4d35-8fbc-a99878fe0001`

Commands are `{"type":"expression","name":"happy"}`, `{"type":"wifi","ssid":"...","password":"..."}`, `{"type":"config","backend_url":"https://...","device_token":"..."}`, `{"type":"play","job_id":"32-lowercase-hex-characters"}`, and `{"type":"status"}`. Expressions: `idle`, `happy`, `listening`, `thinking`, `speaking`, `sad`, `look_left`, `look_right`, `blink`. Status notifications are short text such as `wifi:connected`, `play:started`, `play:done`, `touch`, or `error:...`. The C3 sends `X-Device-Token` when fetching `GET /v1/audio-jobs/{job_id}/audio` and expects mono signed 16-bit little-endian PCM at 16 kHz.

## HTTPS certificate setup

The C3 validates the backend's TLS server certificate. Add your backend certificate authority PEM to your ignored local `include/firmware_config.h` before building for an HTTPS backend:

```cpp
#pragma once
#define AURA_BACKEND_CA_CERT R"PEM(-----BEGIN CERTIFICATE-----
...trusted issuing root CA PEM...
-----END CERTIFICATE-----)PEM"
```

The certificate is a public root CA certificate, **not** the server private key. Use the CA that signs the deployed backend's certificate and update firmware if that trust anchor changes. The backend URL and token are still set from the phone. If this macro is absent, HTTPS playback refuses with `error:tls_ca`; it does not silently disable verification. An `http://` URL can work on a trusted local development network, but it sends audio and the device token without transport encryption and is unsuitable for a gifted device on arbitrary networks. The device obtains time by NTP after Wi-Fi joins; HTTPS playback returns `error:clock` if time cannot be established.

## Current verification and limits

`platformio run -e aura_esp32c3_phone -e aura_esp32s3` builds both targets successfully. The C3 image uses 1,627,442 bytes of 3,145,728 bytes app flash and 61,316 bytes of 327,680 bytes static RAM. This is compile verification only. Pairing behavior, speaker loudness, boot behavior on the actual SuperMini clone, and Android hotspot behavior require a physical device test. BLE and Wi-Fi share the C3 radio, so the screen may animate less smoothly during audio downloads. This initial build has no over-the-air firmware update; code and CA changes still need USB flashing.
