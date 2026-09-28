# Aura enclosure: printable prototype revision A

The companion parametric model is [aura_enclosure.scad](../aura_enclosure.scad). It generates two independent STLs by changing `part` to `"top"` and then `"base"`. Units are millimetres. The shape is a low, rounded pebble with its expressive circular display and discreet speaker grille on the upward face. The two pieces meet at z = 4 mm and fasten with four M2 screws from below.

## Envelope and coordinate system

Origin is the centre of the base. +Y points to the rear (charger and switch), +X to the NFC side, and +Z upward. The enclosure is **132 W × 112 D × 62 H**. The lower body is a rounded rectangle with 22 mm corner radius. The crown tapers to a 118 × 98 mm rounded upper outline. The side wall is nominally 3 mm, the crown is about 7 mm over its inner cavity, and the base floor is 4 mm. The base tongue is 3 mm high with 0.5 mm nominal radial assembly clearance and four relief notches for the screw bosses. A light adhesive foam gasket can close the visible seam.

| Item | Location / reserved space | Retention and access |
| --- | --- | --- |
| Waveshare 1.28 in LCD | Face centre **(-24, -17)**; through aperture Ø33.2, upper bevel Ø35.5; PCB 40.4 × 37.5 beneath crown | Four Ø5 support lands at z = 52.5–56. Use thin removable foam tape at PCB edges after measuring glass-to-PCB height. Do not press on display glass or ribbon. |
| Adafruit Ø40 speaker | Centre **(29, 18)**; 44 mm annular landing at z = 51–56, keyed 1 mm into crown; grille has Ø2.5 bores on a 5 mm lattice | Thin closed-cell ring/gasket on the *frame only*. Speaker body hangs approximately 20 mm down. Keep its diaphragm and rear vent clear. |
| ESP32-S3-DevKitC-1 | PCB centre about **(-29, 16)**, long axis along Y; reserve 29 × 67 mm and PCB support plane z = 29 | Two side rails and four crown-connected hangers accept removable thin foam tape or nylon ties. USB connectors face rear. Leave antenna end free of battery foil, wiring bundles, and metal fasteners; check actual antenna end on the board. |
| Protected 1200 mAh LiPo | Base bay centred **(-29, 17)**; usable **38 × 66 × 8 mm** for 34 × 62 × 5 mm cell and soft lining | Low perimeter guides only. Attach with a battery-safe removable foam pad to the base floor. No screw, rib, or rail presses on the pouch. Leave a loop and strain relief at JST lead. |
| MAX98357A breakout | Adhesive platform near **(17, -15)**, about 24 × 22 mm; adjust to 19.4 × 17.8 mm PCB and terminal height | Removable foam tape; route twisted speaker pair directly to speaker, clear of microphone wires. The platform is joined to the crown by a central column. |
| INMP441 microphone | Front wall acoustic bore centre approximately **(8, -56, 31)**, Ø1.5 | Make a measured adhesive bracket or compliant foam gasket for the purchased breakout. Its **bottom sound port** must meet the bore with no glue blocking it. |
| TTP223 touch board | Top face, nominal centre **(28, -32)**, reserved 18 × 18 mm | A 21 × 21 mm inner pocket leaves a **1.5 mm** roof. Bond sensor electrode flush to it with thin nonmetallic tape. Verify sensitivity with a printed coupon before the final shell. |
| Protected TP4056 USB-C board | Rear centre roughly **(0, 37)**, reserve 20 × 30 mm; rear aperture x = -6…6, z = 9…17 | Adhesive/screw-on carrier sized to the purchased board. Align connector with rear cutout, then enlarge/shift the cutout to the actual USB-C receptacle. Charging occurs with Aura switched off. |
| SPST switch | Rear at x = 26…40, z = 26…33, nominal 14 × 7 mm access | Choose a miniature slide switch with a flange or add a purchased-switch-specific bracket. Route switched OUT+ away from the mic. |
| NTAG213 sticker | Right side exterior, recessed face approximately **x = 65.2**, y = -23…18, z = 19…45, for 40 × 25 mm sticker | Stick NFC on the outer recessed plastic and cover with a nonmetallic label/clear film. Keep metal, cell foil, and speaker magnet as far away as this layout allows; verify phone tap range before final adhesive. |

## Wiring and service path

Put the battery and its charger leads in the base, with a small service loop crossing the seam at the rear. Fit the regulator/carrier near the charger on an insulated mount, then route 3V3 and ground along the inner rear wall to the DevKit. The nominal cavity leaves a vertical gap between the battery (around z = 4–12) and the DevKit board support (z = 29). Run LCD SPI and touch wires toward the crown, and keep the microphone cable on the front wall away from the speaker pair. The four shell screws are at **(±55, ±38)**. Each Ø9 boss has a short rib into the side wall. The base has Ø2.2 clearance holes and Ø4.2 head counterbores; the shell has Ø1.65 pilot bores. Use M2 × 10–12 mm pan-head screws if pilot behavior is suitable for the chosen material, or redesign bosses for heat-set inserts after measuring insert depth and outside diameter. Avoid overdriving screws into the crown.

The DevKit's own USB ports are available only after opening the base in this revision. Disconnect the battery/system 3V3 rail before using those ports for programming, per the electrical handoff. The exposed rear USB-C opening is **charger-only**. This distinction should be marked on an internal label.

## Print and assembly

1. Print a dimension coupon with the Ø33.2 aperture, M2 pilot/counterbore, base tongue, and 1.0–1.5 mm touch-zone samples. Measure actual purchased modules. The values in the model are nominal envelopes, not a substitute for a fit check.
2. Export `top` and `base` as separate STL files. Start with PETG or PLA, 0.2 mm layers, four perimeters, 20–30% infill, and supports under the crown and internal shelves as required by slicer preview. Place the base floor on the bed. For the top, choose orientation/supports to protect the visible face and clean all acoustic and screw openings. A printed 0.2 mm tolerance coupon determines whether `clearance` needs adjustment.
3. Deburr the display and USB openings. Dry fit the display before bonding. Add a speaker frame gasket, then bond the speaker without sealing its rear acoustic volume. Install the touch sensor against its verified thin zone. Align the microphone sound port using a soft gasket.
4. Secure battery to the base with nonrigid removable tape. Secure the DevKit and amplifier in the top; strap down wires at the rear. Add nonconductive insulation below all PCBs. Connect the battery only after the power-chain bench checks in `hardware_bom_wiring.md`.
5. Join the halves without pinching the LiPo or leads, then tighten the four M2 screws gently. Check charging with switch off, speaker and microphone acoustic paths, screen centring, touch sensitivity, NFC tap distance, Wi-Fi reception, and case temperature before gift use.

## Fit freeze items

The **TP4056, TTP223, microphone breakout, slide switch, regulator carrier, display stack height, speaker terminal protrusion, and DevKit width/antenna orientation** vary by seller or board revision. Measure them with calipers and update their retainers and cutouts in the OpenSCAD source before the final print. The speaker and NFC are relatively close on the right side; if phone read range is poor, move the tag to a thin front/rear wall and retest. This revision is a prototype enclosure, not a validated battery or acoustic product design.
