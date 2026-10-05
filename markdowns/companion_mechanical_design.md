# Aura R1 rechargeable snap-fit companion

The new assembly is [companion/Aura_R1_Main_Assembly.step](../companion/Aura_R1_Main_Assembly.step). Open [START_HERE.html](../companion/START_HERE.html) for the illustrated file index. It replaces the USB-only shell as the **battery prototype direction**; existing firmware and earlier CAD remain unchanged.

**Status: engineering prototype, not released for final manufacture.** CAD is dimensioned and checked against the stated envelopes. Several locally stocked generic modules lack complete manufacturer mechanical drawings. Those dimensions are explicitly provisional, not falsely certified exact. Measure the purchased modules, update the source, and print the coupons before the final enclosure. No physical fit, electrical, thermal, radio, charging or latch-cycle tests have been performed.

## Files and editing

- Main named assembly: `companion/Aura_R1_Main_Assembly.step`, with separate printable, purchased-module, hardware and visual-only groups.
- Individual STEP solids: `companion/parts/printed`, `electronics`, `hardware`, `visual`. The visual group represents lit pixels, not purchasable parts.
- Ready-to-slice STLs: `companion/STL`, containing only the 13 parts that are 3D printed. These are identical to the bed-positioned exports in `companion/parts/printed`. Electronics, inserts, screws, foam and the battery are purchased items and are excluded from that folder. Fit coupons are separate in `companion/parts/coupons`.
- Exploded assembly and GLB: `companion/exports`.
- Actual geometry renders, dimension drawings and power diagram: `companion/drawings`.
- Full pin-by-pin wiring, header orientations and charging: [WIRING.html](../companion/WIRING.html), [printable PDF](../companion/Aura_R1_Wiring_Diagram.pdf), and [companion_wiring.md](companion_wiring.md).
- Supplier evidence and unresolved dimensions: `companion/research/components.json`; validation reports and part/insert tables are alongside it.
- Parametric source: `companion/tools/build_companion.py`; rebuild with `companion/tools/rebuild.ps1`.

The delivered assembly is **STEP, not a native SLDASM**, and its parts are BREP solids rather than a SolidWorks sketch/feature history. The source script supplies the editable construction. In SolidWorks, open the main STEP as an assembly, retaining its supplied structure. Avoid the import option **Import assembly as multiple body part**, which flattens that structure. The [SolidWorks documentation](https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_reading_step_iges_acis_sw.htm?id=18.17.8) describes these choices. Native conversion can be performed using Save As after importing. The existing `companion/companion.SLDPRT` was not edited. Automatic approval blocked visual access to the running SolidWorks session, so no native SolidWorks import or visual check is claimed.

## Size, datums and construction

All coordinates are millimetres: X right, Y rear, Z up; front is -Y. The body origin is on the bottom centre. Shell size is **90 W x 78 D x 74 H**, excluding small protrusions. The final report gives the complete assembly bounds including bezel, toggle and feet. Plan corner radius is 16; top blend 8; lower blend 3. Wall 2.4, floor 2.8. The local top touch skin is 1.4 thick. The shallow optional right-side NFC seat is diameter 26 and 0.3 deep; no tag is included in the mandatory BOM.

The seam is between Z24.00 and 24.35. A segmented tongue provides nominal 0.35 radial clearance. A 0.5 mm foam perimeter is represented compressed to 0.35 mm to reduce rattle; it is not a waterproof seal. Four side-access cantilever hooks secure the lower section. No exterior assembly screws are required. Internal M3 fasteners permit module replacement and display alignment.

| Printed part | Function / installation |
| --- | --- |
| P01 upper shell | LCD, speaker and touch mount bosses; removable electronics deck; USB inlet; recessed toggle well; four latch receivers |
| P02 snap base | Four latches, power-board edge supports, battery-cradle mounts and foot recesses |
| P03 bezel | 44 OD / 33.4 ID; 0.2 mm removable adhesive, entirely above the removable base seam |
| P04 display carrier | Slotted M3 ears, PCB edge pads, lateral/end registration and header exit; adjustable to the actual breakout |
| P05 electronics deck | Three mounting points and wire passages; lifts the C3 away from battery metal |
| P06 / P07 snap caps | Separate C3 and amplifier PCB-edge retention; no assumed board hole pattern |
| P08 power retainer | Holds charger/boost PCB edges through compliant pads; clears USB and tall potentiometer |
| P09 battery cradle | Removable holder seat, strap clearance and internal M3 screws; no cell compression |
| P10 touch frame | Holds sensor PCB edges under the thin top skin; electrode faces the roof |
| P11 speaker retainer | Three-point cage with perimeter gasket; diaphragm remains free |
| P12 / P13 USB carrier and cap | Replaceable inlet tray, insertion-force end stop, top capture and two shared M3 x 8 screws |

Use the part files in their assembled coordinates for CAD integration. STL exports are separately positioned on the print bed. This distinction is intentional.

## Component evidence and selection

All electronic modules were selected from Sri Lankan supplier pages, checked 2026-10-01. Tronic is preferred. Its C3 listing was out of stock, so the selected C3 comes from Alphatronic. The dimensioned MT3608 comes from Duino, and the compact enclosed speaker and inserts from Alphatronic. Stock is a point-in-time observation, not a reservation.

| Component | Selected seller / dimensions | What remains to verify |
| --- | --- | --- |
| ESP32-C3 SuperMini | [Alphatronic A33](https://alphatronic.lk/product/esp32-c3-supermini/), 22.5 x 18 PCB | Thickness, component heights, antenna end and USB projection |
| GC9A01 display | [Tronic DM0049](https://tronic.lk/product/1-28-inch-240x240-round-tft-lcd-display-module-rgb-3-3v) | Breakout outline and stack are unverified; provisional 38 x 45.5 x 1.6 PCB |
| TTP223 | [Tronic MD0206](https://tronic.lk/product/ttp223-1-channel-digital-capacitive-touch-sensor-module) | Blue four-hole module; 24 x 24 x 7 is an allowance, not its drawing |
| MAX98357 | [Tronic MD0860](https://tronic.lk/product/max98357-i2s-3w-class-d-amplifier-breakout-interface-da), 18 x 19 PCB | Terminal block, PCB thickness and underside height |
| Speaker | [Alphatronic PAL36](https://alphatronic.lk/product/3020-enclosed-mini-audio-speaker-4-ohms-3w/), 30 x 20 x 7, 4 ohm, 3 W | Wire exit and acoustic face |
| Cell / holder | [Tronic BA0199](https://tronic.lk/product/samsung-18650-flat-top-3-7v-3500ma-li-ion-rechargeable-) / [BA0039](https://tronic.lk/product/battery-holder-case-for-1x18650) | Actual cell model and limits; diameter 18.6 x 65.2 and 77 x 21 x 23 holder are provisional fit allowances |
| Charger | [Tronic MD0744](https://tronic.lk/product/tp4056-5v-1a-type-c-18650-lithium-battery-charging-modu), 26 x 17 | Populated height, protection layout and RPROG package |
| Boost | [Duino ML2060](https://www.duino.lk/product/mt3608-dc-dc-step-up-converter-28v-2a/), 36 x 17 x 14 | Current/thermal capability in this assembly |
| Toggle | [Tronic BU0014](https://tronic.lk/product/dpdt-toggle-switch-6-pin-125vac-6a),approx 13 x 12 x 31 | Bushing, nut, lever travel and DC contact rating |
| USB inlet | [Tronic MD0840](https://tronic.lk/product/usb-type-c-female-to-dip-adapter-breakout-board-6x2pin-) | 22 x 18 PCB/socket details are provisional; CC resistor configuration |
| Inserts | [Alphatronic M3 x 4 x 5](https://alphatronic.lk/product/brass-threaded-insert-knurled-m3/), 18 pieces | Trial installation bore; do not substitute other advertised variants |

The [Elecrow drawing linked by Tronic](https://www.elecrow.com/download/1.28_inch_round_LCD_datasheet.pdf), pages 3–4, specifies **the panel** at 35.60±0.10 x 38.10±0.10 x 1.50±0.10, active diameter 32.40. It does not specify the local breakout PCB. The [Toppop GMT128](https://www.toppoplcd.com/productdetails_5631439.html) offers an analogous 38 x 45.5 PCB, which is used only as a clearly marked envelope. The 40.4 x 37.5 Waveshare module is a different design. The LCD reference model uses a circular panel with simplified tail geometry; it is not an exact replica of the flex or glass outline.

Use direct soldered wires and low-profile strain relief. Upright Dupont headers and long jumper plugs are outside the reserved volumes. Preserve wire loops across the removable seam and keep them away from snap arms, the antenna and speaker diaphragm.

## Inserts, screws and fit coupons

There are **18 M3 x 4 x 5 inserts**, **16 M3 x 6 screws**, and **2 M3 x 8 screws** for the USB carrier. The screws have a conservative 6 mm diameter x 2.4 mm head representation; verify the chosen [local Phillips pan-head hardware](https://alphatronic.lk/product/m3-phillips-head-bolts-with-nuts/) before printing. Threads are simplified in CAD. Do not substitute longer screws near the LCD or touch roof.

The coordinate table `research/insert_locations.csv` identifies every insert axis and seat. Bosses are around 8 mm diameter. The printed pilot is a starting diameter 4.4 mm; the actual knurled insert manufacturer does not supply a qualified plastic pilot. Print C01 and test 4.3, 4.4, 4.5, 4.6 bores with the actual insert/filament/tool. Install square, slightly recessed, with the electronics removed. Intentional insert-to-plastic interference is separately listed in the CAD report.

Main latch parameters: 1.2 mm beam thickness, 6 mm width, 16.5 mm nominal free length to the bearing face, 0.4 mm root radius, 0.35 mm catch. A conservative 16.1 mm effective length and 0.7 mm total assumed deflection give approximately **0.486% outer-fibre strain** using 1.5*t*deflection/L². This is a preliminary beam estimate based on the [Covestro snap-fit guide](https://solutions.covestro.com/-/media/covestro/solution-center/brands/downloads/imported/1557218421.pdf?hash=B5FD81DD85B31E8482923AAF06EC1767&rev=c018a63d23e344c5b8bce6c975fd0c66), not validation of printed PETG or fatigue life. The coupon uses the same root, hook and receiver relationship. Test insertion, release, layer adhesion and repeat cycles. Tune fit before printing the case.

Suggested starting process: PETG, 0.4 mm nozzle, 0.2 mm layers, 4 perimeters, 25–35% infill. Keep snap roots solid. P02 prints floor-down. P01 prints seam-down with carefully placed support under the roof, bosses and interior shelves; do not allow support damage in latch pockets. P04 prints broad rear face-down, tabs upward. The two PCB caps print frame-down with arms upward. The supplied STLs apply these orientations; inspect them in the slicer. Other small parts may need local support where the bed-positioned orientation includes offsets. Dimensional tolerance and layer strength still depend on the actual printer.

## Battery and charging circuit

Use [the complete wiring guide](companion_wiring.md) for the exact selected module labels and header views. It explicitly connects amplifier SD to C3 3V3 for LEFT audio, supplies two independent Type-C Rd paths, and identifies DPDT commons/throws by continuity. The charger now has conflicting supplier mechanical evidence: text 26 x 17 mm versus dimensioned photo 28 x 17 mm; measure the received board before final printing.

This revision uses one 18650 cell, a protected TP4056 module and a 5 V MT3608 booster. A DPDT switch selects settled RUN or CHARGE states. It is **not a charge-and-play circuit**. The external inlet is separate from the charger's native USB, which stays internal.

```text
Cell + / - -> charger B+ / B-
Charger OUT+ / OUT- -> booster VIN+ / VIN-

Pole A common -> system5V
  RUN throw -> booster OUT+
  other throw -> open, insulated

Pole B common -> charger IN+
  CHARGE throw -> external USB-C VBUS
  other throw -> open, insulated

External USB ground + all system grounds -> protected OUT-/IN-
Only cell negative -> B-
```

Identify switch commons and throws by continuity; do not infer pin numbers from its shape. Verify the actual charger topology against a schematic. A [comparable protected module](https://www.handsontec.com/dataspecs/module/18650-Lithium%20charger.pdf), page 4, places IN-/OUT- together and switches B- through the protection MOSFETs. That is reference evidence, not proof of the purchased PCB. No system connection may bypass protection or feed a GPIO from an unswitched rail.

Fit independent 5.1 k resistors from CC1 and CC2 to ground if the selected inlet has none; never tie CC1 and CC2 together. This follows the [TI5 V Type-C sink reference](https://www.ti.com/lit/ug/tiduem6/tiduem6.pdf). Use 5 V charging only. Set the booster to 5.0 V under a dummy load before connecting the C3 or amplifier.

Change charger RPROG to approximately 3.0 k, subject to actual pad/package compatibility, and measure charge current. The [TopPower datasheet](https://www.toppwr.com/uploadfile/file/20241228/676f612b9f2dd.pdf) table/formula imply roughly 367–400 mA, not an exact universal clone value. Target at most 500 mA until the authentic cell's limits are known. Cell temperature sensing is usually disabled on these modules; charger die thermal regulation does not replace cell-temperature qualification.

The booster remains connected in CHARGE. Measure total booster input idle current at 4.2 V; target≤2 mA and verify a complete charge/termination cycle with it attached. The module's total idle current is not its IC's quiescent specification. Remove the cell for long storage.

**Programming:** set CHARGE before connecting the internal C3 USB. Unplug that programming cable before switching to RUN, or PC VBUS and boosted 5 V may be paralleled. All normal peripheral positive supplies must be downstream of pole A. The external charging inlet interlock does not protect against this service-port misuse. Switch transition timing and bounce also remain unqualified; only settled-state isolation is specified.

Use provisional validation limits of 0.5 A continuous and 0.8 A brief peak at 5 V. At3.0 V and 80% assumed efficiency these imply about 1.04 A/1.67 A battery current. Full 3 W speaker output alone can exceed the continuous budget. Retain the firmware's current 45% PCM cap as a starting point and set a measured audio limit during combined Wi-Fi/display/speech testing. The AC rating on the generic MTS-202 listing does not establish a DC rating.

The existing C3 signal wiring remains: LCD SCLK4, MOSI6, CS7, DC5, RST3; touch 20; amplifier BCLK0, LRC1, DIN10. LCD and touch use C3's 3V3; amplifier uses switched 5 V. GPIO18/19 remain for native USB. Neither speaker terminal goes to ground. The phone supplies the microphone.

## Assembly and release sequence

### Heatsinks and ventilation

Read [HEATSINKS_AND_COOLING.txt](../companion/HEATSINKS_AND_COOLING.txt) before selecting additional cooling hardware. **No add-on heatsink is currently specified or mechanically qualified.** The charger and booster are the primary thermal checks. The case has three low front intake slots, 4 x 1.4 mm, and four high rear outlets, 7.6 x 1.4 mm. The outlets sit outside the sealed speaker footprint. Their cooling performance still requires testing.

| Component | Cooling decision |
| --- | --- |
| TP4056 | About 0.8 W calculated at 5 V input, 3 V cell and 0.4 A. Prioritize the underside thermal pad and PCB copper; lower charge current if needed. A top adhesive sink is not qualified. [TopPower, p16](https://www.toppwr.com/uploadfile/file/20241228/676f612b9f2dd.pdf) |
| MT3608 | Estimated total loss 0.28–0.63 W at 5 V / 0.5 A if efficiency is 90–80%. Measure the IC, diode and inductor. Preserve PCB heat spreading, then derate or engineer a spreader if required. [Aerosemi, p6](https://cdn.ozdisan.com/public/product/assets/MT3608-Rev3.1.pdf) |
| MAX98357 A | No external sink expected at verified 9 dB gain and the 45% PCM cap. Confirm the gain strap; unconnected GAIN_SLOT selects 9 dB. The cap alone does not guarantee low power at higher gain. [Analog Devices, pp 15/28](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX98357A-MAX98357B.pdf) |
| ESP32-C3 | No external sink selected; check MCU and regulator temperatures. Preserve ground-pad heat spreading and antenna clearance. [Espressif](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32c3/pcb-layout-design.html) |
| Cell / LCD / touch / speaker | No add-on sink selected. Keep hot components and metal heat spreaders away from the cell. |

These are engineering starting choices, not measured thermal results. Any added sink requires a new electrical-isolation and CAD clearance check; do not add a generic metal block over exposed module pins.

### Build and physical verification

1. Buy the exact listed modules and record caliper measurements in `research/measurement_checklist.csv`. Confirm the actual cell identity and electrical limits. Resolve every provisional envelope before final printing; the display/USB/battery carriers are separate parts so corrections remain local where possible.
2. Print and test insert, snap and cable coupons. Rebuild after any dimensional change. Print the enclosure and carriers; remove supports and inspect slots, insulating gaps and thin touch roof.
3. Fit inserts and toggle hardware with electronics absent. Add foam pads and the speaker gasket. Mount LCD lightly, centre its active area in the bezel, and route its flex/wires clear of fasteners. Fit touch electrode toward the roof. Install deck and PCB caps.
4. Install the USB tray/capture cap and verify repeated plug insertion against its end stop. Install charger and booster in the base, with insulated low-profile wiring. Fit the empty battery holder/cradle/strap; add the cell only after bench wiring checks.
5. Use current-limited bench supplies to verify switch states, charge current, boost voltage, supply transitions, protection operation and system load. Verify no 5 V reaches a 3V3-only module. Test protection using appropriate equipment, not deliberate abuse of a real cell.
6. Close the enclosure without trapping wires. Ensure all four catches latch; use the side release windows and a nonmetallic tool to open it, retaining released sides with thin shims rather than pulling forcefully. Check feet, touch hold, speaker quality and radio performance.
7. Test a full charge cycle and worst permitted Wi-Fi/audio load in the closed case at intended ambient temperature. Confirm cell, boost/charger and plastic temperatures, peak voltage droop, connector/contact temperatures and stable restart near battery cutoff. Only then release the device for use as a gift.

Estimated runtime or charge time is not established by this CAD. Supplier capacity and power-module labels are insufficient to certify it. The report records only the geometry, import, mesh and review checks actually performed.
