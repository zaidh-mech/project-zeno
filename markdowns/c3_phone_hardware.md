# Aura phone + ESP32-C3 build

This is the current compact direction. The Android phone supplies the microphone and runs the web interface. The ESP32-C3 SuperMini drives the round eyes, reads the head touch sensor, and plays replies through a small speaker. The AI service still runs on a separate backend; no API key belongs in the ESP32 or web page.

```text
Android Chrome website --BLE commands/setup--> C3 --SPI--> round screen
        |                                    |--GPIO--> touch sensor
        | phone microphone                   |--I2S--> MAX98357A --> speaker
        v                                    |
    HTTPS AI backend <--Wi-Fi audio fetch-----+
```

## What to buy

| Part | Purpose | Local example / price checked 2026-09-28 |
| --- | --- | --- |
| ESP32-C3 SuperMini, 4 MB flash | Main controller, Wi-Fi and BLE | [Tronic MD0929](https://tronic.lk/product/supermini-esp32-c3-dev-board-type-c-wifi-bluetooth-iot), Rs 850, **currently out of stock** |
| 1.28 inch GC9A01 240×240 SPI display, 3.3 V | Animated eyes | [Tronic DM0049](https://tronic.lk/product/1-28-inch-240x240-round-tft-lcd-display-module-rgb-3-3v), Rs 1,450 |
| TTP223 touch module | Head tap | [Tronic MD0206](https://tronic.lk/product/ttp223-1-channel-digital-capacitive-touch-sensor-module), Rs 60 |
| MAX98357A I2S amplifier | Converts digital reply audio to speaker output | [Tronic MD0860](https://tronic.lk/product/max98357-i2s-3w-class-d-amplifier-breakout-interface-da), Rs 480 |
| Small speaker, impedance and power matched to the amplifier and enclosure | Reply voice | A [1.55 inch 8 Ω 0.5 W speaker](https://tronic.lk/product/8-ohm-0-5w-speaker-1-55-inch) is Rs 60 but needs a strict output volume limit. Select the actual speaker before printing. |
| NTAG213/216 NFC sticker | Opens the birthday site by phone tap; electrically separate from MCU | Price/source to select |
| USB-C power supply and cable | First prototype power | Use first, before battery design |

The priced electronic core above is **Rs 2,900** with the 0.5 W example speaker, excluding NFC, wiring, case, shipping, power supply, and backend/API usage. Do not buy the out-of-stock C3 from this seller until availability changes. The speaker example is a quiet prototype choice; a higher rated 4 Ω or 8 Ω speaker can give more headroom if it fits.

**Battery option after USB prototype:** protected single-cell LiPo, a charger with protection, an on/off switch, and a measured 3.3 V regulator capable of the C3's Wi-Fi current peaks. The local [TP4056 board](https://tronic.lk/product/tp4056-5v-1a-type-c-18650-lithium-battery-charging-modu) is Rs 120 and ships at 1 A charge current; change its programming resistor to suit the chosen cell. A [700 mA buck-boost module](https://tronic.lk/product/miniature-automatic-voltage-regulator-module-buck-boost) is Rs 280 but must be load-tested with display and Wi-Fi peaks before using it for the finished build. The TP4056 does not give a proper simultaneous charge-and-run power path. This battery scheme is still an electrical prototype, not a finished gift power design.

There is **no INMP441 microphone** in this version. The phone supplies input. The amplifier and speaker remain because voice should come from Aura. The touch module is the first sensor; other sensors can be added only after deciding what behavior they should trigger and checking remaining C3 pins.

## Network and handoff

- The recipient selects their own 2.4 GHz Wi-Fi network or Android hotspot from the setup page and enters its password; firmware stores it in nonvolatile memory. Reconfigure when the network changes. No SSID is compiled into the gift.
- Bluetooth controls the eyes and carries setup commands, even when the device has no Wi-Fi. It does **not** give the C3 internet access through the phone's mobile data by itself.
- Voice replies require the C3 to reach the same HTTPS backend over Wi-Fi. A phone hotspot can supply that Wi-Fi; the phone can still use cellular data. The backend must have an internet-reachable HTTPS address rather than the maker's private `192.168.x.x` address.
- The website must be served over HTTPS for Android Chrome to use Web Bluetooth and the microphone. Opening an NFC tag can lead to that page, but browser pairing still needs a user tap. [Chrome Web Bluetooth requirements](https://developer.chrome.com/docs/capabilities/bluetooth)
- The C3's Wi-Fi and BLE share one radio, so voice downloads may briefly delay eye commands. [Espressif coexistence guide](https://docs.espressif.com/projects/esp-idf/en/v5.0.4/esp32c3/api-guides/coexist.html)

## Assembly checkpoints

Power the first build from USB and check display, touch, and speaker independently. Confirm the exact SuperMini pin labels against the received board and the C3 firmware pin map before soldering. Keep GPIO18/19 for USB and avoid changing the boot strapping state of GPIO2/8/9. [Espressif C3 GPIO reference](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32c3/api-reference/peripherals/gpio.html)

The existing [S3 hardware design](hardware_bom_wiring.md) and [large enclosure](cad_design_spec.md) describe the earlier standalone microphone build. They are not the final C3 wiring or shell dimensions.
