# Aura hardware BOM and wiring

## Build baseline

Use the **Espressif ESP32-S3-DevKitC-1-N8R8**, specifically the N8R8 variant with 8 MB flash and 8 MB PSRAM. Espressif lists the 3V3 header as a supported power input and warns that USB, 5 V header, and 3V3 header supplies are mutually exclusive. The v1.1 board's on-board RGB LED is GPIO38; the older board uses GPIO48. Neither is assigned below. GPIO35–37 are reserved for the module's octal PSRAM. [Espressif DevKitC-1 guide](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html)

This is a battery powered **prototype** with a deliberate charge/off switch. The TP4056 charger has no system power path. Aura is off during charging, and the dev board USB ports are for programming only with the battery/system rail disconnected. This prevents the charger from mistaking load current for charge current and prevents two regulators from driving the 3V3 rail together. [TP4056 datasheet](https://cdn.sparkfun.com/datasheets/Prototyping/TP4056.pdf), [Espressif guide](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html)

## Bill of materials

USD single unit estimates checked September 2026. Prices exclude shipping, tax, printed shell, and labor. `~` means an allowance pending the chosen seller/module size.

| Item | Concrete selection | Qty | Estimate | Notes/source |
| --- | --- | ---: | ---: | --- |
| MCU | ESP32-S3-DevKitC-1-N8R8 | 1 | $15.00 | [Espressif specification](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html), [DigiKey sample price](https://www.digikey.com/en/products/detail/espressif-systems/ESP32-S3-DEVKITC-1-N8R8/15202420) |
| Display | Waveshare SKU 19192, 1.28 in GC9A01, 240 × 240, no touch | 1 | $14.99 | [Waveshare listing](https://www.waveshare.com/product/1.28inch-lcd-module.htm) |
| Microphone | INMP441 I2S breakout | 1 | $4.12 | [TDK silicon datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf), [example breakout listing](https://electropeak.com/inmp441-mems-microphone-module-i2s-interface) |
| Amplifier | Adafruit MAX98357A mono I2S breakout #3006 | 1 | $5.95 | 19.4 × 17.8 × 3 mm; [Adafruit](https://www.adafruit.com/product/3006) |
| Speaker | Adafruit #3968, 40 mm, 4 Ω, current revision rated 5 W | 1 | $4.95 | Meets 3 W project minimum; 20 mm deep; [Adafruit](https://www.adafruit.com/product/3968) |
| Head touch | TTP223 momentary, active-high module | 1 | ~$1.50 | Verify module jumpers and dimensions; [Tontek silicon specification](https://www.tontek.com.tw/uploads/product/244/TTP223-CA6_V2.0_EN.pdf) |
| NFC | NTAG213 sticker, Adafruit #4032 | 1 | $2.95 | 40 × 25 mm; stores portal URL, no MCU connection; [Adafruit](https://www.adafruit.com/product/4032) |
| Battery | Adafruit protected 1-cell LiPo #258, 1200 mAh | 1 | $9.95 | 34 × 62 × 5 mm, JST-PH; maximum stated charge rate 500 mA; [Adafruit](https://www.adafruit.com/product/258) |
| Charger/protection | USB-C TP4056 module with **DW01A and dual MOSFET protection**, separate B+/B- and OUT+/OUT- | 1 | ~$5.49 | Verify protection chips, polarity, and USB-C 5 V operation on received board; [example listing](https://www.jacobsparts.com/items/CPNT-C) |
| LDO | MCP1826S-3302E/DB 3.3 V 1 A, with 4.7 µF input and 10 µF output capacitors on carrier/perfboard | 1 | $0.91 + ~$1 | [Microchip datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/22057B.pdf), [Mouser price](https://www.mouser.com/en/ProductDetail/Microchip-Technology/MCP1826S-3302E-DB?qs=gsqZ4L1luKqjUo%2Fe%2Fgllfg%3D%3D) |
| Other | SPST power switch, JST-PH mating lead, 100–220 µF rail capacitor, 100 kΩ divider resistors ×2, wire/perfboard | 1 set | ~$5 | Allowance; measure bought parts before CAD freeze |

**Indicative total: ~$67**, with vendor and shipping variation. A cheap compatible display, amp, and battery can reduce the cost, but their mechanical and electrical details must be checked before substituting.

## Power wiring

```text
5 V USB-C charger input -> TP4056 charger module
LiPo + / -            -> TP4056 B+ / B- (check actual JST polarity)
TP4056 OUT+           -> SPST OFF/ON switch -> VBAT_SW (about 3.0–4.2 V)
TP4056 OUT-           -> common GND
VBAT_SW               -> MAX98357A VIN
VBAT_SW               -> MCP1826S VIN, 4.7 µF to GND at regulator
MCP1826S 3.3 V OUT    -> ESP32-S3 DevKitC-1 3V3 header, LCD VCC,
                         INMP441 VDD, TTP223 VCC; 10 µF at regulator
GND                   -> ESP G, LCD GND, INMP441 GND,
                         TTP223 GND, MAX98357A GND
```

The MAX98357A accepts 2.5–5.5 V, so the switched protected cell powers it directly. Its **3.2 W rating requires 5 V into 4 Ω**; on this 3.0–4.2 V cell it will be quieter. Cap firmware volume to avoid clipping and brownouts. Both speaker wires connect **only** to amp `SPK+` and `SPK-`; neither speaker lead goes to ground. [Analog Devices MAX98357A](https://www.analog.com/en/products/max98357a.html), [Adafruit breakout notes](https://www.adafruit.com/product/3006)

The LDO supplies the MCU and small peripherals, leaving speaker power off the LDO. The MCP1826S has up to 400 mV dropout at 1 A, so a 3.3 V LDO cannot use the whole LiPo discharge curve: expect early brownout as the cell approaches roughly 3.5–3.7 V under load. Measure this on the assembled unit. The 1200 mAh cell's *nominal* 4.5 Wh is not a runtime guarantee; Wi-Fi, display backlight, speaker level, and this LDO cutoff govern runtime. Add a 100–220 µF capacitor at the 3V3 rail near the ESP board, then verify regulator stability and temperature. [Microchip MCP1826S](https://ww1.microchip.com/downloads/en/DeviceDoc/22057B.pdf), [battery details](https://www.adafruit.com/product/258)

Set TP4056 `RPROG` to **2.4 kΩ for about 500 mA**; common modules ship at ~1 A, above this battery seller's stated 500 mA maximum. The charger module and the battery both carry protection, but the two boards' polarity and protection operation still require bench checking. Put the switch **after OUT+**, never between charger B+/B- and the cell. Keep Aura switched OFF whenever charge USB is inserted. Do not charge an unattended, damaged, bent, or compressed cell. [TP4056 datasheet](https://cdn.sparkfun.com/datasheets/Prototyping/TP4056.pdf), [Adafruit battery cautions](https://www.adafruit.com/product/258)

For a later version that runs while charging and uses more battery capacity, replace the TP4056-only architecture with a charger that includes a true power path and a suitable buck-boost rail. That would be a circuit change, not a firmware setting.

## Pin map

All GPIO signals are **3.3 V logic**. Use short ground-referenced leads; keep microphone wiring away from speaker output and the Wi-Fi antenna. The two I2S peripherals use separate ESP32-S3 I2S controllers and separate clocks, so capture and playback can be configured independently. The SPI display uses no MISO and shares no assigned pins with audio. [Espressif header map](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html), [Waveshare interface](https://docs.waveshare.net/1.28inch_LCD_Module/), [TDK microphone](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf)

| Peripheral signal | ESP32-S3 GPIO | Connection / note |
| --- | ---: | --- |
| GC9A01 `CLK` | 12 | SPI SCLK, mode 0 |
| GC9A01 `DIN` | 11 | SPI MOSI; no MISO |
| GC9A01 `CS` | 10 | active low |
| GC9A01 `DC` | 9 | data/command |
| GC9A01 `RST` | 8 | active low |
| GC9A01 `BL` | 7 | backlight control; begin with full on, verify module input polarity before PWM |
| INMP441 `SCK` | 4 | I2S RX BCLK, controller 0 |
| INMP441 `WS` | 5 | I2S RX word select, controller 0 |
| INMP441 `SD` | 6 | I2S RX serial data into MCU, controller 0 |
| INMP441 `L/R` | — | tie to GND to select left slot; parse 24-bit signed sample in 32-bit slot |
| MAX98357A `BCLK` | 15 | I2S TX bit clock, controller 1 |
| MAX98357A `LRC` | 16 | I2S TX word select, controller 1 |
| MAX98357A `DIN` | 17 | I2S TX serial audio, controller 1 |
| MAX98357A `SD/MODE` | 18 | optional amp enable/shutdown; verify specific breakout behavior; default breakout works floating |
| TTP223 `OUT` | 21 | interrupt input, rising edge for momentary active-high board |
| Battery divider midpoint | 1 | optional ADC1_CH0, 100 kΩ from VBAT_SW to GPIO1 and 100 kΩ from GPIO1 to GND; software calibration required |

GPIO19/20 stay free for native USB, GPIO0/45/46 are boot/strapping related and unused, GPIO43/44 stay free for UART, and GPIO35–37 are not available with this PSRAM module. If `SD/MODE` on the selected amp breakout does not expose true shutdown, leave GPIO18 unused and fit the breakout's documented default connection. The display module's `BL` input behavior can vary by revision; power and verify before driving PWM. [Espressif guide](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html), [Adafruit amp guide](https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp)

## Mechanical handoff

| Part | Envelope to reserve |
| --- | --- |
| DevKitC-1 board | Official PCB length **62.74 mm**; reserve at least **65 × 29 mm** footprint plus header/wire and USB access. Verify board revision width against the actual unit before printing final standoffs. [Espressif drawing](https://dl.espressif.com/dl/PCB_ESP32-S3-DevKitC-1_V1_20210312CB.pdf) |
| LCD | PCB **40.4 × 37.5 mm**; circular active panel **Ø32.4 mm**. Leave bezel and ribbon/PH2.0 cable clearance. [Waveshare](https://www.waveshare.com/product/1.28inch-lcd-module.htm) |
| Battery | **34 × 62 × 5 mm** cell; reserve **38 × 66 × 8 mm** soft-lined bay with strain relief, no screw points over cell. [Adafruit](https://www.adafruit.com/product/258) |
| Amplifier | **19.4 × 17.8 × 3 mm** PCB; allow terminals and cable bend. [Adafruit](https://www.adafruit.com/product/3006) |
| Speaker | **Ø40 × 20 mm** overall; allow grille and rear air space. [Adafruit](https://www.adafruit.com/product/3968) |
| NFC sticker | **40 × 25 mm** on an unmetalized, thin side wall, away from speaker magnet and battery foil. [Adafruit](https://www.adafruit.com/product/4032) |
| TTP223, TP4056 | Generic breakout sizes vary; reserve approximately **18 × 18 mm** and **20 × 30 mm**, respectively, but dimension actual purchased modules before final print. |

Locate the MEMS mic at a dedicated acoustic hole away from the speaker grille. The INMP441 is a **bottom port** microphone, so align its PCB port with the enclosure opening and protect it from glue. Keep the ESP module antenna outside dense wiring and away from the battery foil. The touch pad should sit against a thin plastic top section; tune the wall thickness on a test print. The NFC sticker is passive and should carry the production HTTPS portal URL as an NDEF URI; no wiring or firmware NFC reader is required. [TDK INMP441](https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf), [Adafruit NTAG213](https://www.adafruit.com/product/4032)

## Bench checks before enclosure assembly

1. With battery unplugged, verify LiPo and charger JST polarity, charger board B/OUT labels, and 2.4 kΩ charge resistor.
2. With current-limited bench supply replacing the battery, switch on and measure 3V3 at the MCU during Wi-Fi transmit and display refresh; verify no 3V3 sag or hot regulator.
3. Confirm mic slot and sample polarity, amp output at low volume, touch active-high mode, and LCD backlight behavior.
4. Test charging with power switch OFF. Disconnect the battery/system rail before plugging USB into either dev board programming port.
5. Repeat at low cell voltage under realistic audio load to select a firmware low-battery warning threshold above the LDO brownout point.
