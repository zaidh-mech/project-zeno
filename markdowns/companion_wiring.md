# Aura R1 pin-by-pin wiring and charging

Open [WIRING.html](../companion/WIRING.html) for the illustrated instructions, or print [Aura_R1_Wiring_Diagram.pdf](../companion/Aura_R1_Wiring_Diagram.pdf). The four sheets cover signals, rechargeable power, physical header views and charging terminals. [wiring_connections.csv](../companion/research/wiring_connections.csv) lists every connection. The source of truth is [wiring.json](../companion/research/wiring.json); regenerate with `companion/tools/build_wiring.py` or the full `companion/tools/rebuild.ps1`.

This is the **ESP32-C3 phone-input version**. It matches `aura_esp32c3_phone` in `platformio.ini` and `src/c3_main.cpp`. GPIO numbers below are the board's GPIO labels, not IC package pin numbers. Supplier photographs establish the selected module header labels; verify the received board revision before soldering. No assembled hardware, charging or thermal test is claimed.

## Signal and supply connections

| Module pad | Connect to | Function |
| --- | --- | --- |
| C3 **5V** | **SYS_5V**, switch A_COMMON | Regulated, switched 5.0 V input |
| C3 **GND** | **PGND** | Protected system ground |
| C3 **3V3** | LCD VCC, touch VCC, amplifier SD | C3 regulated output; never apply 5 V here |
| LCD **VCC** | C3 **3V3** | Display supply, 3.3 V |
| LCD **GND** | PGND | Return |
| LCD **SCL** | C3 **GPIO4** | SPI clock; this is not an I2C connection |
| LCD **SDA** | C3 **GPIO6** | SPI MOSI; no MISO connection needed |
| LCD **DC** | C3 **GPIO5** | Data/command |
| LCD **CS** | C3 **GPIO7** | Chip select |
| LCD **RST** | C3 **GPIO3** | Display reset |
| Touch **SIG** | C3 **GPIO20** | Active-high, momentary touch output |
| Touch **VCC** | C3 **3V3** | Keeps SIG at a C3-compatible voltage |
| Touch **GND** | PGND | Return |
| Amplifier **Vin** | SYS_5V | Regulated 5.0 V |
| Amplifier **GND** | PGND | Return |
| Amplifier **BCLK** | C3 **GPIO0** | I2S bit clock |
| Amplifier **LRC** | C3 **GPIO1** | I2S LRCLK/word select |
| Amplifier **DIN** | C3 **GPIO10** | I2S data |
| Amplifier **SD** | C3 **3V3** | Explicit LEFT-channel selection |
| Amplifier **GAIN** | Leave open | Nominal 9 dB if the board has no fitted gain strap |
| Amplifier **+** | Speaker positive | Bridged speaker output |
| Amplifier **−** | Speaker negative | Bridged output; this is **not ground** |

The selected speaker is Alphatronic PAL36, 4 ohm / 3 W. Neither speaker terminal connects to PGND. The MAX98357A needs no MCLK. Its 3.3 V digital inputs are compatible with the 5 V amplifier supply. SD high selects LEFT, matching firmware `I2S_CHANNEL_FMT_ONLY_LEFT`; leaving SD floating preserves the photographed module's default channel averaging. Leave GAIN unconnected for the initial 9 dB setting, inspecting existing straps first. The current 45% firmware cap scales PCM amplitude, not watts. [Analog Devices datasheet, tables 5 and 8](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX98357A-MAX98357B.pdf)

The seven-pin Tronic display has no separate BL header pad; firmware `TFT_BL=-1` matches this arrangement. Use 3.3 V for the display and touch sensor. The [display listing](https://tronic.lk/product/1-28-inch-240x240-round-tft-lcd-display-module-rgb-3-3v) specifies a 3.3 V module. The [touch listing](https://tronic.lk/product/ttp223-1-channel-digital-capacitive-touch-sensor-module) specifies active-high behavior; its [TonTek IC datasheet](https://www.tontek.com.tw/uploads/product/245/TTP223-HA6_V1.1_EN.pdf) supports operation at 3.3 V.

No new connections use GPIO2/8/9, which are boot strapping pins. Native USB uses GPIO18/19 internally. GPIO20 also serves UART0 RX, so use native USB programming with this touch wiring. The Android phone provides microphone input. Passive NFC, if fitted, has no electrical wire to the C3. [Espressif GPIO reference](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32c3/api-reference/peripherals/gpio.html)

## Physical header order

These are **component-side views**, not interchangeable front and back views. Sheet 1 uses functional pin placement for readable routing; Sheet 3 specifies the physical header direction.

| Selected module and view | Order |
| --- | --- |
| LCD DM0049, **back/component face**, seven-pin header at bottom | Left to right: **VCC, GND, SCL, SDA, DC, CS, RST** |
| Touch MD0206, component face, three-pin header at top | Left to right: **SIG, VCC, GND** |
| Amp MD0860, component face, seven-pin header at bottom | Left to right: **LRC, BCLK, DIN, GAIN, SD, GND, Vin** |
| Amp speaker connector, same view | Top left **−**; top right **+** |

The actual supplier images establish these orders: [LCD rear](https://tronic.lk/assets/uploads/6a4e1de1b85ce38f614cf53b78e938cb.jpg), [touch](https://tronic.lk/assets/uploads/ae7e3f170516ab13ffc41c7b9ccb7764.jpg), [amp component face](https://tronic.lk/assets/uploads/e8f2ef16254cc5b22516550c68265817.jpg), [amp rear](https://tronic.lk/assets/uploads/7f536fb3fe4361ff3b8116001ba2f6a0.jpg). In particular, the LCD VCC/GND and DC/CS positions differ from several generic GC9A01 diagrams. Its display/front face reverses the apparent order.

For the C3, the **component face with USB at the top** has the following reference layout:

| Row down from USB | Left header | Right header |
| --- | --- | --- |
| 1 | GPIO5 | 5V |
| 2 | GPIO6 | GND |
| 3 | GPIO7 | 3V3 |
| 4 | GPIO8 | GPIO4 |
| 5 | GPIO9 | GPIO3 |
| 6 | GPIO10 | GPIO2 |
| 7 | GPIO20 | GPIO1 |
| 8 | GPIO21 | GPIO0 |

This is derived from the [Nologo manufacturer pin diagram](https://wiki.nologo.tech/assets/img/esp32/esp32c3supermini/esp32c3foot1.png), whose view is the **underside** and therefore reversed. It is consistent with visible corner markings on the [Alphatronic A33 photograph](https://alphatronic.lk/wp-content/uploads/2023/10/ESP32-C3-Supermini-WiFi-BT-Dev-Board.webp), but A33 does not provide a revision-specific schematic. Match the actual silk and check its 5 V/USB power topology. The [manufacturer reference schematic](https://wiki.nologo.tech/assets/img/esp32/esp32c3supermini/esp32c3schematicdiagram.png) directly joins the 5 V header and USB VBUS; its downstream diode does not isolate those sources.

## Battery and USB-C charger wiring

Use one correctly identified 18650 cell in the selected holder. **CELL_NEG and PGND are different wiring nets.** The protection board switches the cell return internally; do not add an external bypass wire.

| From | To |
| --- | --- |
| Battery holder positive | TP4056 **B+** |
| Battery holder negative | TP4056 **B− only** |
| TP4056 **OUT+** | MT3608 **VIN+** |
| TP4056 **OUT−** | MT3608 **VIN−** and PGND distribution |
| MT3608 **VOUT−** | PGND |
| MT3608 **VOUT+** | DPDT **A_RUN** |
| DPDT **A_COMMON** | SYS_5V distribution: C3 **5V** and amp **Vin** |
| DPDT **A_UNUSED** | Open and insulated |
| USB-C inlet's **two VCC pads** | Join both to DPDT **B_CHARGE** |
| DPDT **B_COMMON** | TP4056 input **+**, called IN+ in the diagram |
| DPDT **B_UNUSED** | Open and insulated |
| USB-C inlet's **two GND pads** | Join both to TP4056 input **−** and PGND |
| USB-C **CC1** | One **5.1 kΩ** resistor to PGND, if absent |
| USB-C **CC2** | Its own **5.1 kΩ** resistor to PGND, if absent |
| USB-C **DP1, DN1, DP2, DN2, SBU1, SBU2** | Open |

Keep all peripheral positive supplies downstream of A_COMMON. No module should receive direct power from the cell or TP4056 OUT+ except the booster. SYS_5V enters the C3's **5V** pad; its regulator supplies the 3V3 loads. Do not apply raw cell voltage to 3V3 or 5V as a substitute for the booster.

On the exact [MD0744 photograph](https://tronic.lk/assets/uploads/cf3567a41545268ed7099b5718adbd45.jpg), component face with USB-C pointing **left**, the left upper input pad is **+** and the lower input pad is **−**. Its right edge reads **OUT+, B+, B−, OUT−** from top to bottom. The expected IN−/OUT− common-ground protection topology is shown in a [comparable module schematic, page 4](https://www.handsontec.com/dataspecs/module/18650-Lithium%20charger.pdf); that schematic is reference evidence, so check the actual module's traces/continuity before assembly.

The exact Duino ML2060 labels are **VIN+/VIN−** at the inductor/IC end and **VOUT+/VOUT−** at the blue-potentiometer end. [Selected board underside](https://www.duino.lk/wp-content/uploads/2022/01/MT3608-DC-DC-Step-Up-28V-2A-2.jpg) Confirm the two negative terminals share ground and set VOUT to **5.0 V under a dummy load before attaching the electronics**. The existing R1 limit of 0.5 A continuous / 0.8 A brief is a bench-test target, not a guaranteed module capability.

The exact [MD0840 photo](https://tronic.lk/assets/uploads/854388f2e0b19d3163bfce8514a7bbe0.jpg) shows the green **HW-139** inlet. It has two VCC pads, two GND pads, separate CC1/CC2, four data pads and two SBU pads. No Rd resistors are visible on the photographed face; inspect both faces and measure before adding them. There must be **one total 5.1 kΩ from each CC pin to PGND**. Do not short CC1 and CC2 or put a second resistor in parallel with an existing one. With the inlet alone and cables disconnected, expect approximately 5.1 kΩ from each CC to GND and 10.2 kΩ between CC1 and CC2 through the two resistors. This is a 5 V sink, not a USB-PD higher-voltage request. [TI Type-C sink reference](https://www.ti.com/lit/ug/tiduem6/tiduem6.pdf)

## Identify the six switch lugs

The [BU0014 switch photograph](https://tronic.lk/assets/uploads/cae45a15fd50b097d9f4750b7fc7846f.jpg) shows **six unnumbered lugs**. The symbols A_COMMON/A_RUN and B_COMMON/B_CHARGE are logical names you assign after continuity testing, not invented factory pin numbers. The two unused throws remain insulated and unconnected.

With the switch unpowered and unwired, identify the two independent three-terminal poles, each common and its two alternate throws. Then mount the switch and identify which lever direction matches the enclosure's RUN and CHG legends. Wire to obtain this matrix:

| Contact | RUN | CHARGE |
| --- | --- | --- |
| A_COMMON ↔ A_RUN | Closed | Open |
| A_COMMON ↔ A_UNUSED | Open | Closed, but unused lug has no wire |
| B_COMMON ↔ B_CHARGE | Open | Closed |
| B_COMMON ↔ B_UNUSED | Closed, but unused lug has no wire | Open |
| Pole A ↔ pole B | Isolated | Isolated |

The supplier does not establish switching transition timing or a DC contact rating. Verify these for the intended current; only settled-state isolation is represented in the diagram. Both unused throws are open, so switch wiring does not deliberately short either source to ground. This is a **charge-or-run** circuit, not a load-sharing power-path charger.

## Set charge current and charge the device

**Remove the fitted RPROG resistor and replace it with 3.0 kΩ. Do not parallel another resistor onto it.** Confirm the resistor pads connect TP4056 **IC pin 2, PROG**, to **pin 3, GND**. The photo's likely R3 designator is not sufficient proof. Match the received board's resistor footprint; the BOM's 0805 resistor is a local purchase candidate, not a confirmed mechanical fit. The [manufacturer datasheet](https://www.toppwr.com/uploadfile/file/20241228/676f612b9f2dd.pdf) implies approximately 367–400 mA at 3.0 kΩ. Measure actual current and use at most 500 mA initially, or the authentic cell's limit if lower.

To charge, select **CHARGE**, then connect a regulated **5 V USB wall source rated at least 1 A** to the external inlet. Pole B feeds charger IN+ while pole A opens SYS_5V. The normal device load is off. The protected TP4056 charges its one cell and terminates automatically subject to the actual module and load behavior. Confirm charge/full LED meanings on the received board. The enclosed charger’s native USB-C socket stays **unused** because it bypasses this charge-input interlock.

The booster remains connected to the battery during CHARGE and consumes idle current. Measure its total input idle current at 4.2 V, targeting ≤2 mA, then verify a full charge and termination cycle with that idle load attached. CHARGE is not a full battery-storage disconnect; remove the cell for long storage. Runtime and charge time remain unmeasured.

For PC programming, select **CHARGE before connecting the C3's own USB**. That cable may power SYS_5V and attached peripherals through the board's 5 V node. Unplug the programming cable before selecting RUN, otherwise PC VBUS and boosted 5 V can be paralleled on the reference SuperMini topology. The external charging inlet is separate and does not itself power SYS_5V.

## Assembly checks

1. With power disconnected, verify board labels and solder joints; identify switch contacts and ensure no external B−/PGND bypass. Measure the inlet's two independent Rd paths before attaching a USB source.
2. Calibrate and load-test the booster before connecting C3 or amplifier. Check both 5.0 V and C3 3.3 V under combined Wi-Fi, display and permitted audio load. Retain the modules’ fitted bypass capacitors; add local decoupling if measured transients require it.
3. With only the external charging inlet connected, CHARGE must enable charger IN+ and let SYS_5V/3V3 decay to off. RUN must disconnect charger IN+ and power the companion from the boosted battery. Test with no C3 programming cable attached.
4. Measure charge current after the RPROG replacement and confirm full termination, protection and restart behavior. Test protection using suitable bench equipment rather than deliberate abuse of a real cell.
5. Check touch active-high behavior, LCD operation and LEFT-channel speaker playback. Keep speaker leads as a short twisted pair; route digital wires away from boost switching parts and keep all wiring clear of snap arms, the antenna and the battery contacts.
6. Perform closed-case charging and worst permitted Wi-Fi/audio temperature tests. See [HEATSINKS_AND_COOLING.txt](../companion/HEATSINKS_AND_COOLING.txt). No thermal shutdown or charge-current foldback should be normal operation.

The static netlist audit checks firmware GPIO agreement, distinct battery-negative/protected-ground wiring, separate CC resistors, isolated speaker outputs and both switch states. Its graph omits semiconductor behavior, switching transients and the internal programming-USB route; those are explicitly left to hardware validation.

One newly found mechanical conflict remains: the MD0744 text says **26 × 17 mm**, while its [dimensioned supplier image](https://tronic.lk/assets/uploads/7ce7ac159a5286fc7d5e7cc4d5fd4138.jpg) says **28 × 17 mm**. The current CAD charger envelope is 26 × 17 mm; measure the actual board, including USB projection, before the final print.
