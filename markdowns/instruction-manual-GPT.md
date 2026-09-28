# MASTER PROJECT SPECIFICATION: "Aura" - Desk Buddy AI Birthday Companion

## 1. Project Overview
**Objective:** Architect, simulate, and generate code/assets for a minimalistic, battery-powered desk buddy AI assistant designed as a romantic, cute birthday gift.
**Core Features:** Voice interaction (mic/speaker), expressive face (screen), physical interaction (touch sensor), passive mobile interaction (NFC), and a companion interactive Next.js web app.
**Budget Strategy:** Minimalist, utilizing readily available hobbyist components (ESP32-S3 ecosystem) while maintaining a polished final look.

## 2. Agentic Harness Instructions
This document serves as the root node for a multi-agent architecture. The orchestrator must spawn the following five distinct agents and have them generate their respective deliverables in isolated resource files.

### AGENT 1: Hardware & Electronics Engineer
**Role:** Define the physical electrical architecture and Bill of Materials (BOM).
**Hardware Constraints:**
- MCU: ESP32-S3 with PSRAM (crucial for audio buffering and wake-word detection).
- Display: 1.28" GC9A01 Round LCD (SPI interface for a cute eye/face).
- Audio Input: INMP441 I2S MEMS Microphone.
- Audio Output: MAX98357A I2S Class-D Amplifier + 4Ω 3W Speaker.
- Interaction: 1x TTP223 Capacitive Touch Sensor (for petting/head pats).
- Passive: NTAG213 NFC sticker.
- Power: 3.7V LiPo Battery + TP4056 USB-C Charging and protection circuit + 3.3V LDO regulator.
**Deliverable (`hardware_bom_wiring.md`):** Generate a complete BOM with estimated costs and a precise pinout/wiring map connecting all peripherals to the ESP32-S3, avoiding I2S and SPI conflicts.

### AGENT 2: Firmware & Embedded Developer
**Role:** Write the C++/Arduino (or ESP-IDF) firmware for the ESP32-S3.
**Software Constraints:**
- Integrate `TFT_eSPI` for the round LCD to render animated eyes (sleeping, happy, listening, talking).
- Utilize I2S to read from the INMP441 and output to the MAX98357A.
- Implement WiFi management.
- Handle touch sensor interrupts.
- Manage bidirectional API communication (transmit compressed audio/text to the backend LLM API, stream TTS audio back).
**Deliverable (`firmware_main.cpp` & `platformio.ini`):** Generate the boilerplate PlatformIO environment and the main loop structure handling the state machine (Idle, Listening, Processing, Speaking, Petting).

### AGENT 3: AI Personality & Backend Architect
**Role:** Design the LLM system prompt and backend routing.
**Personality Constraints:** 
- Tone: Cute, romantic, deeply affectionate, playful, and warm. 
- The AI must refer to the user by a pet name and acknowledge the birthday context.
**Deliverable (`ai_personality_backend.md`):** Generate the strict System Prompt for the LLM. Provide a minimal Node.js/Python server script that accepts audio/text from the ESP32, queries the LLM (OpenAI/Anthropic), converts the response to audio via a TTS API (e.g., ElevenLabs or OpenAI TTS), and returns the stream to the hardware.

### AGENT 4: Industrial Designer (3D CAD)
**Role:** Specify the 3D printable enclosure design.
**Design Constraints:**
- Style: Minimalist, soft curves (no sharp edges), perhaps resembling a smooth pebble or a stylized small creature (like an Eve/Wall-E hybrid).
- Features: Cutout for the round screen, discreet speaker grill mesh holes, internal mounting standoffs for the ESP32, battery, and amp.
- Interaction zones: Designated thin wall section at the top for the TTP223 touch sensor to work through the plastic. Recessed slot on the side for the NFC sticker.
**Deliverable (`cad_design_spec.md`):** Write an OpenSCAD script or a highly detailed textual blueprint with exact millimeter dimensions for the enclosure, split into a top shell and bottom base plate (snap-fit or M2 threaded inserts).

### AGENT 5: Frontend Web Developer
**Role:** Create the interactive Next.js webpage triggered by the NFC tag.
**Software Constraints:**
- Tech Stack: Next.js, React, Tailwind CSS, Three.js/React Three Fiber (for 3D interactivity), and Framer Motion.
- Experience: When the user taps their phone, it opens a romantic, interactive birthday portal. It should feature a 3D floating object (like a heart or a stylized version of the desk buddy), floating particles, and a hidden "love letter" unlocked by tapping the screen.
**Deliverable (`nfc_nextjs_app.md` & `page.tsx`):** Generate the Next.js component structure, the interactive 3D canvas code, and the Tailwind styling required for a highly polished, mobile-first web experience.

## 3. Execution Order
1. Orchestrator reads this master file.
2. Spawn **Agent 1** to confirm pinouts.
3. Pass pinouts to **Agent 2** to draft firmware.
4. Spawn **Agent 3** to establish the API bridge.
5. Spawn **Agent 4** to enclose the finalized electronics.
6. Spawn **Agent 5** to build the companion web app.