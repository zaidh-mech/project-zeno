# Aura compact C3 enclosure, prototype revision A

The two-part printable model is [aura_c3_compact_enclosure.scad](../aura_c3_compact_enclosure.scad). Set `part` to `"shell"` and `"base"` and export each STL separately. This design is for the **USB-powered ESP32-C3 SuperMini build**. The Android phone is the microphone; there is no cell, charger, or microphone breakout in the enclosure. The earlier [S3 enclosure](cad_design_spec.md) remains a separate, larger design.

## Dimensions and orientation

The rounded body is **84 W Ã— 80 D Ã— 53 H mm**. The base is 4 mm thick; the shell has a nominal 3 mm side wall and a 4 mm crown. The outline tapers from 84 Ã— 80 mm at the lower wall to 76 Ã— 72 mm at the crown. The base has a 3 mm tongue with 0.45 mm nominal radial clearance and four relief notches. Four M2 screws fasten from below into wall-connected bosses at **(Â±33, Â±29)**. The screw bores are Ã˜2.2 through the base with Ã˜4.2 head pockets and Ã˜1.65 pilot holes in the shell; tune the pilots on a print coupon. Axes: front = -Y, rear = +Y, right = +X, up = +Z.

| Part | Envelope and location | Mounting / detail |
| --- | --- | --- |
| 1.28 in GC9A01 display | Nominal PCB 40.4 Ã— 37.5 mm, centred at **(-14, -10)** under crown; Ã˜33.2 circular aperture with Ã˜34.8 bevel | Four small lands at z = 46â€“50. Seat PCB edges with thin removable tape; shim to suit the real glass-to-PCB height. Do not clamp the glass or ribbon. |
| TTP223 touch board | Approximate 18 Ã— 18 mm board, centred under top at **(24, -13)** | 19 Ã— 19 mm underside pocket leaves a 1.5 mm plastic roof. Bond the sensing face to this patch with nonmetallic tape. The patch must remain reachable for a **3-second provisioning hold**. |
| 1.55 in / approximately Ã˜39.4 speaker | Rear-facing, centre **(0, +38.5, 26)**; Ã˜43 outer / Ã˜35 inner annular landing; grille holes Ã˜2.2 at 5 mm pitch | A thin soft gasket adheres only to the speaker rim. The basket extends toward the centre of the case, roughly to y = +14 mm if 20 mm deep. Its bottom reaches about z = 6 mm and clears the base. Keep terminals clear of the C3 and amplifier. |
| ESP32-C3 SuperMini | Approximate **24 Ã— 20 mm** board near **(-15, -23)**, PCB supported at z â‰ˆ 7 mm | Four low base pads and removable foam/nylon retention. Point native USB-C toward the front cutout at x = -22â€¦-8, z = 6â€¦16. Match cutout to the bought board's connector position and cable plug overmould. Preserve its antenna end away from speaker metal and dense wiring. |
| MAX98357A amplifier | Reserve about **22 Ã— 20 mm** near **(14, -18)** on the base | Four low guide posts and nonconductive removable tape. Route short twisted speaker leads toward rear grille. Use the firmware/hardware output-volume limit appropriate to the selected speaker. |
| Optional NTAG213 sticker | Recess on right side at x â‰ˆ 41.3, y = -20.5â€¦+20.5, z = 15â€¦41 | Fits a nominal 40 Ã— 25 mm passive sticker. Cover with nonmetallic film. No electronic NFC connection. Check actual phone read range with the speaker installed. |

The USB-C opening exposes the **SuperMini's power/programming port**, so a normal USB cable powers the complete first prototype. Leave the cable connected for bench and desk use. Do not fit the old S3 LiPo/TP4056 power chain into this case. If a battery version is later chosen, redesign the power electronics and case together.

## Wire routing and build sequence

1. Check the purchased screen PCB, speaker outside diameter/depth, C3 board and USB connector, MAX98357A, and TTP223 with calipers. â€œSuperMiniâ€ boards vary. Test the Ã˜33.2 aperture, M2 pilot, tongue clearance, and 1.5 mm touch patch as small coupons before the full print.
2. Print the base floor-down. Print the shell with the open side toward the bed and supports under the crown and interior lands, or use slicer supports/orientation that protect the visible face. Start with 0.2 mm layers, four perimeters, and 20â€“30% infill. Remove support from all grille holes and the USB opening.
3. Dry-fit the display behind its opening. Bond only the PCB edge. Bond the speaker rim to the rear ring with a soft gasket, preserving diaphragm travel. Bond the touch module to the thin roof patch with its electrode toward the plastic. A 3-second touch must work after final assembly.
4. Fix the C3 and amplifier to insulated base pads. Keep a service loop at the seam, route SPI/touch wires along the left/front region, and run the speaker pair along the right/rear. The firmware pin plan uses GC9A01 GPIO4/6/7/5/3, TTP223 GPIO20, and MAX98357A GPIO0/1/10; the display backlight is tied to 3V3 and amplifier enable high. GPIO18/19 remain available for native USB. The enclosure itself does not require a particular pin order.
5. Close the halves without trapping wires, tighten M2 screws gently, and check USB plug insertion, Wi-Fi/BLE performance, speaker voice quality, grille clearance, eye alignment, touch/long-hold behavior, and NFC phone range if a sticker is installed.

## Fit and validation limits

This CAD reserves plausible envelopes; it is not dimensionally frozen to a particular seller's modules. The **C3 USB port position, display stack height, speaker depth and flange, TTP223 electrode location, amplifier terminals, and NFC sticker thickness** all need measurement. Reposition posts/openings in the SCAD source after receiving parts. The 1.55 in 8 Î© 0.5 W example speaker requires low playback volume; its acoustic output will be modest. No OpenSCAD executable was available in this workspace session, so the source has been reviewed for connected bosses/ring/lands but no STL render or physical fit validation was performed.
