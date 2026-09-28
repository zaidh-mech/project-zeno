# Aura firmware setup

The target is **ESP32-S3-DevKitC-1-N8R8** (8 MB flash, 8 MB octal PSRAM). The pin assignments are fixed in `src/main.cpp` and the `TFT_eSPI` build flags in `platformio.ini`; follow `hardware_bom_wiring.md` when assembling. The board's on-board USB power is for bench testing. See the hardware document for the battery power design.

1. Copy `include/firmware_config.h.example` to `include/firmware_config.h` and set the Wi-Fi name, password, and LAN backend URL. Set the device token if the backend uses one. The local config file is ignored by git.
2. Build with `platformio run -e aura_esp32s3`, then upload with `platformio run -e aura_esp32s3 -t upload` and inspect the serial monitor at 115200 baud.
3. Tap the TTP223 pad. Aura smiles for 750 ms and then listens. Another tap ends capture. It also ends capture after 900 ms of silence or eight seconds total. Idle blinks and, after 30 seconds without interaction, shows closed sleepy eyes.

Open the repository root (the folder containing `platformio.ini`) as a PlatformIO project in VS Code. The firmware now uses PlatformIO's standard `src/main.cpp` and `include/` folders. If the editor still marks framework or library includes as missing, run `platformio run -e aura_esp32s3 -t compiledb` to generate `compile_commands.json`; `.vscode/settings.json` points the C/C++ extension at it. The generated database is local and ignored by git.

The device records **signed 16-bit little-endian mono PCM at 16 kHz** into PSRAM, then sends it as the body of `POST /v1/voice`. It sets `Content-Type: audio/pcm;rate=16000;channels=1;format=s16le` and `X-Device-Token` when configured. Successful responses must contain headerless PCM16LE mono at 16 kHz. Both fixed-length and chunked HTTP bodies are supported via `HTTPClient::writeToStream`. Non-200 responses are logged and never played. Plain HTTP is intended for a trusted LAN; use a secure gateway or TLS client for deployment over the internet.

The INMP441 L/R pin is tied to ground and the firmware reads the left slot of 32-bit I2S frames. `VOICE_THRESHOLD` is an average absolute amplitude and should be tuned on the assembled device. Speaker samples are scaled to 45% in `OUTPUT_VOLUME_PERCENT` to limit draw and clipping; tune on the assembled device. The optional MAX98357A SD pin is driven high only during playback. The renderer uses simple shapes so it does not need image assets. An NFC sticker is passive and has no firmware connection.

The code compiled against PlatformIO `espressif32@6.12.0`, Arduino ESP32 2.0.17, and TFT_eSPI 2.5.43. Audio, pin behavior, display orientation, and wake threshold still require a physical device check.
