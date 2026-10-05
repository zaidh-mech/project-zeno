"""Aura R1 mechanical prototype. Units: mm; +Z up, -Y front.

Purchased modules are simplified envelope models, not manufacturer CAD.
Read research/components.json and the design note before procurement/printing.
All STEP parts share the assembly datum. Printable STLs are bed-positioned.
"""
from __future__ import annotations
import argparse
import csv
import json
import math
from pathlib import Path
import cadquery as cq

ROOT = Path(__file__).resolve().parents[1]
W, D, H = 90.0, 78.0, 74.0
WALL, FLOOR, R = 2.4, 2.8, 16.0
SEAM_LO, SEAM_HI = 24.0, 24.35
FACE_Z = 46.5
BAT_Y = 21.0
PILOT = 4.4
PARTS = {}
INSTANCES = []
INTENTIONAL = []
FEATURES = {}


def box(w, d, h, x=0, y=0, z=0):
    return cq.Workplane('XY').box(w, d, h, centered=(True, True, False)).translate((x, y, z)).val()


def color(hex_value):
    return cq.Color(*(int(hex_value[i:i+2],16)/255 for i in (1,3,5)))


def rr(w, d, h, r=2, x=0, y=0, z=0):
    q = cq.Workplane('XY').box(w, d, h, centered=(True, True, False))
    if r:
        q = q.edges('|Z').fillet(r)
    return q.translate((x, y, z)).val()


def cyl(radius, length, p, direction=(0, 0, 1)):
    return cq.Solid.makeCylinder(radius, length, cq.Vector(*p), cq.Vector(*direction))


def cone(r1, r2, length, p, direction=(0, 0, 1)):
    return cq.Solid.makeCone(r1, r2, length, cq.Vector(*p), cq.Vector(*direction))


def union(*shapes):
    return shapes[0].fuse(*shapes[1:]).clean() if len(shapes) > 1 else shapes[0]


def subtract(shape, *tools):
    return shape.cut(*tools).clean()


def ring(ro, ri, length, p, direction=(0, 0, 1)):
    return cyl(ro, length, p, direction).cut(cyl(ri, length + .02,
        tuple(p[i] - .01 * direction[i] for i in range(3)), direction))


def xz_plate(w, h, depth, x=0, y=0, z=0, r=0):
    # Extrusion from y towards +Y, centred in X and Z.
    q = rr(w, h, depth, r).rotate((0, 0, 0), (1, 0, 0), -90)
    return q.translate((x, y, z))


def yz_prism(points, width, x0):
    return cq.Workplane('YZ', origin=(x0, 0, 0)).polyline(points).close().extrude(width).val()


def xz_prism(points, width, y0):
    # XZ workplane normal is -Y.
    return cq.Workplane('XZ', origin=(0, y0 + width, 0)).polyline(points).close().extrude(width).val()


def record(key, shape, category, color, material, description, print_axis='Z', features=None):
    shape = shape.clean()
    if not shape.isValid():
        raise RuntimeError('Invalid BREP: ' + key)
    if category == 'printed' and len(shape.Solids()) != 1:
        raise RuntimeError(f'{key}: printable part has {len(shape.Solids())} disconnected solids')
    PARTS[key] = dict(shape=shape, category=category, color=color, material=material,
                      description=description, print_axis=print_axis)
    FEATURES[key] = features or []
    INSTANCES.append(dict(name=key, part=key, translation=[0, 0, 0]))
    print('BUILT', key, 'solids', len(shape.Solids()), flush=True)
    return shape


def hole_z(x, y, z, depth, diameter=PILOT):
    return cyl(diameter / 2, depth, (x, y, z))


def insert_z(name, x, y, top, host):
    shape = ring(2.5, 1.55, 4, (x, y, top - 4))
    record(name, shape, 'hardware', '#B58B43', 'brass', 'M3 x 4 x 5 heat-set insert; interference with printed pilot is intentional')
    INTENTIONAL.append([name, host, 'Heat-set installation: OD5 insert into trial diameter4.4 printed pilot'])


def screw_z(name, x, y, seat, length, host=None):
    shape = union(cyl(1.48, length, (x, y, seat - length)), cyl(3, 2.4, (x, y, seat)))
    shape = shape.cut(box(3.5, .8, .9, x, y, seat + 1.6)).cut(box(.8,3.5,.9,x,y,seat+1.6))
    record(name, shape, 'hardware', '#606870', 'steel', f'M3 x {length:g} pan-head screw, simplified thread')


def build():
    # Rounded shell: constant 2.4 wall, 2.8 floor, 8 mm top blend, 3 mm bottom blend.
    outside = rr(W, D, H, R)
    outside = cq.Workplane(obj=outside).edges('>Z').fillet(8).edges('<Z').fillet(3).val()
    inside = rr(W - 2*WALL, D - 2*WALL, H - FLOOR - WALL, R-WALL, z=FLOOR)
    inside = cq.Workplane(obj=inside).edges('>Z').fillet(5.6).val()
    hollow = outside.cut(inside)
    lower = hollow.intersect(box(200, 200, SEAM_LO, z=0))
    upper = hollow.intersect(box(200, 200, 100, z=SEAM_HI))

    # Lower alignment tongue, 0.35 radial clearance, interrupted at latches.
    tongue = rr(84.5, 72.5, 4.8, 13.25, z=SEAM_LO-.15).cut(
        rr(81.5, 69.5, 5.2, 11.75, z=SEAM_LO-.3))
    # Battery/port side needs no full tongue across the rear; registration remains at corners.
    for sign in (-1, 1):
        for yy in (-20, 20):
            tongue = tongue.cut(box(8, 9, 6, sign*41.5, yy, SEAM_LO-.4))
    tongue_root = rr(86.4,74.4,1.0,14.2,z=23.0).cut(rr(81.5,69.5,1.2,11.75,z=22.9))
    lower = lower.fuse(tongue_root).fuse(tongue)
    lower = lower.cut(box(44,6,6,0,-36,23.9))
    lower = lower.cut(box(25,6,6,26,36,23.9))
    lower = lower.cut(box(78,23,7,0,21,22.8))

    # Four long, low-strain integral cantilever latches. Hook's lower face carries pull-off load.
    for side in (-1, 1):
        for yy in (-20, 20):
            # Build right-hand latch then reflect for left.
            stem = box(1.2, 6, 20, 41.35, yy, 19.0)
            anchor = box(2.4, 8, 3.5, 41.3, yy, 17.5)
            # Root tied to shell below seam; free arm above 21 mm.
            root = box(2.8, 8, 3.0, 42.0, yy, 18.0)
            hook = xz_prism([(40.75,37.5),(42.95,37.5),(42.95,38.2),(41.95,40.0),(40.75,40.0)],6,yy-3)
            latch = union(stem, anchor, root, hook)
            # Relief is cut out of wall and tongue, leaving the beam free above its anchor.
            relief = box(4.0, 7.2, 19.4, 41.2, yy, 21.0)
            pocket = box(2.4, 7.0, 3.2, 42.9, yy, 37.15)
            release = box(6, 5.6, 1.8, 43.1, yy, 38.1)
            if side < 0:
                latch = latch.mirror('YZ')
                relief = relief.mirror('YZ')
                pocket = pocket.mirror('YZ')
                release = release.mirror('YZ')
            lower = lower.cut(relief).fuse(latch)
            upper = upper.cut(pocket).cut(release)
    # Small floor ribs support the battery and electronics without drilling uncertain PCB holes.
    for cx, cy, length in [(-20,-19,26),(19,-14,36)]:
        for sx in (-1,1):
            for sy in (-1,1):
                lower = lower.fuse(cyl(1.5, 2.4, (cx+sx*7, cy+sy*(length/2-2), FLOOR)))
        for sx in (-1,1):
            lower = lower.fuse(box(1.4, length-4, 3.8, cx+sx*9.5, cy, FLOOR))
    lower_mounts = [(-34,-28.5),(34,-28.5),(-33,6),(33,6)]
    for x,y in lower_mounts:
        lower = lower.fuse(cyl(4.0,4.4,(x,y,FLOOR))).cut(hole_z(x,y,2.5,4.9))

    # Recesses for adhesive rubber feet, four shallow 9 mm seats.
    for x in (-29,29):
        for y in (-23,23):
            lower = lower.cut(cyl(4.7,.62,(x,y,-.01)))

    # Face opening and lead-in. Display active diameter is32.4; bezel aperture33.4.
    upper = upper.cut(cyl(17.1,16,(0,-45,FACE_Z),(0,1,0)))
    upper = upper.cut(cone(17.8,17.1,.8,(0,-39.01,FACE_Z),(0,1,0)))

    # Four captive brass insert bosses for adjustable screen carrier, behind front wall.
    face_mounts = [(x,z) for x in (-27,27) for z in (34.5,58.5)]
    for x,z in face_mounts:
        boss = cyl(4,7.2,(x,-36.7,z),(0,1,0))
        rib = box(8,3.0,8,x,-36.2,z-4)
        upper = upper.fuse(boss).fuse(rib)
        upper = upper.cut(cyl(PILOT/2,6.0,(x,-35.4,z),(0,1,0)))

    # Three deck supports avoid metal within the reserved C3 antenna area.
    deck_mounts=[(-36,-17),(35,-17),(5,22)]
    for x,y in deck_mounts:
        boss=cyl(4.0,8.0,(x,y,36.0))
        if x < -30: rib=box(8,7,8,-40,y,36)
        elif x >30: rib=box(8,7,8,39,y,36)
        else: rib=box(7,18,8,x,29,36)
        upper=upper.fuse(boss).fuse(rib).cut(hole_z(x,y,38.9,5.2))

    # Top tap zone: 1.4 mm skin, sensor clamped only at PCB edges.
    upper=upper.cut(rr(28,28,9,2,y=-3,z=63.6))
    for x in (-20,20):
        upper=upper.fuse(cyl(4,4.8,(x,-3,68.4))).cut(hole_z(x,-3,68.3,4.6))

    # Rear speaker apertures. Five 2 x 15 slots, rounded ends, within30x20 speaker.
    for x in (-10,-5,0,5,10):
        slot=xz_plate(2.0,15,10,x,34,56,0.99)
        upper=upper.cut(slot)
    # Rear speaker clamp bosses alongY; four positions just outside its case.
    speaker_mounts=[(x,z) for x in (-19,19) for z in (50,66)]
    # Use the upper pair only; lower right conflicts with recessed toggle well.
    speaker_mounts=[(-19,64),(19,64),(-19,48)]
    for x,z in speaker_mounts:
        upper=upper.fuse(cyl(3.8,8.2,(x,28.8,z),(0,1,0)))
        upper=upper.cut(cyl(PILOT/2,5.3,(x,28.7,z),(0,1,0)))

    # Recessed run/charge toggle well. Approximate switch, replaceable hole dimensions in parameters.
    well=box(22,15.3,20.4,26,31.45,30.1)
    upper=upper.fuse(well)
    upper=upper.cut(box(17.2,17,15.6,26,34.2,32.5))
    upper=upper.cut(cyl(3.3,7,(26,20,39),(0,1,0)))

    # External charging inlet, with a cable-overmould opening12x6, nominal connector envelope.
    upper=upper.cut(xz_plate(16,9,10,-24,33.5,39.85,2.3))
    # Side rails hold separate replaceable USB carrier, retaining screws sit below the deck.
    for x in (-32,-16):
        upper=upper.fuse(cyl(3.6,4.4,(x,12.5,30.6)))
        upper=upper.fuse(box(5,24.5,4.4,x,24.75,30.6))
        upper=upper.cut(hole_z(x,12.5,30.5,4.7))

    # Discrete bottom-front ventilation, away from battery holder.
    for x in (-8,0,8):
        lower=lower.cut(xz_plate(4,1.4,8,x,-41,13,0.6))
    # High outlets are separate from the acoustically sealed speaker grille.
    # These establish a passive air path; heat dissipation still needs closed-case testing.
    for x in (-28,28):
        for zz in (63.5,67):
            upper=upper.cut(xz_plate(7.6,1.4,12,x,33.4,zz,0.65))

    # Final keepouts also trim later-added deck ribs, preserving latch deflection space.
    for side in (-1,1):
        for yy in (-20,20):
            upper=upper.cut(box(2.3,7.2,16.2,side*41.15,yy,24.25))
            upper=upper.cut(box(2.4,7.0,3.2,side*42.9,yy,37.15))
    roots=[e for e in lower.Edges() if abs(e.Center().z-21)<1e-5 and
           min(abs(abs(e.Center().x)-40.75),abs(abs(e.Center().x)-41.95))<1e-5 and 5.9<e.Length()<6.1]
    if len(roots)!=8: raise RuntimeError(f'Expected8 latch root edges,found{len(roots)}')
    lower=cq.Workplane(obj=lower).newObject(roots).fillet(.4).val()
    # Shallow physical legends. Neither cuts into the thin touch sensing skin.
    for word,zz in [('RUN',52.7),('CHG',27.5)]:
        letters=cq.Workplane('XZ',origin=(26,39.2,zz)).text(word,2.6,.8,font='Arial',kind='bold',halign='center',valign='center').val()
        upper=upper.cut(letters.mirror('YZ',(26,0,0)))
    word=cq.Workplane('XZ',origin=(0,-39.01,11)).text('aura',4,-.45,font='Arial',halign='center',valign='center').val()
    lower=lower.cut(word)
    # Optional adhesiveNFC sticker seat, diameter26; passive accessory not part of the mandatoryBOM.
    upper=upper.cut(cyl(13,.6,(44.7,0,53),(1,0,0)))

    record('P01_Upper_shell',upper,'printed','#E4E2D9','PETG','Rounded head; LCD bosses, touch pocket, speaker grille, high rear vents, charge inlet and recessed run/charge toggle',features=['90x78x74 outside datum','2.4 wall;1.4 tap skin','33.4 optical aperture via bezel','four latch receivers','four display insert bosses','three deck insert bosses','three speaker insert bosses','two touch insert bosses','two USB carrier insert bosses','four rear7.6x1.4 exhaust slots'])
    record('P02_Snap_base',lower,'printed','#426966','PETG','Lower tub with four releasable cantilever latches, battery and power mounting bosses',features=['2.8 floor','0.35 seam gap','0.35 tongue radial clearance','four20x6x1.2 snap stems','0.35 nominal hook engagement','four insert bores','rubber foot recesses'])
    seam_pad=rr(89.4,77.4,.35,15.7,z=24).cut(rr(85.8,73.8,.5,13.9,z=23.95))
    record('H00_Seam_anti_rattle_foam',seam_pad,'hardware','#485E58','closed-cell foam','0.5mm sheet cut to wall perimeter; modelled compressed to0.35mm; tune on coupon')

    # Decorative face ring, 0.2 mm double-sided adhesive pad; not a separate display cover lens.
    bezel=ring(22,16.7,1.4,(0,-40.6,FACE_Z),(0,1,0))
    bezel=cq.Workplane(obj=bezel).edges().fillet(.25).val()
    record('P03_Face_bezel',bezel,'printed','#253F41','PETG','Adhesive seated rim,44OD/33.4ID; never load the display glass','Y')
    record('H01_Bezel_adhesive',ring(21.8,17.6,.2,(0,-39.2,FACE_Z),(0,1,0)),'hardware','#444444','acrylic adhesive','0.2mm annular adhesive, removable service item')

    # Adjustable display carrier: bridge the bare-board perimeter and leave header exit open.
    screenframe=xz_plate(44,47,2,0,-29.3,FACE_Z,2)
    screenframe=screenframe.cut(xz_plate(34,39,4,0,-30,FACE_Z,1))
    screenframe=screenframe.cut(box(22,6,7,0,-28,22))
    for x,z in face_mounts:
        screenframe=screenframe.fuse(xz_plate(12,9,2,x*.92,-29.3,z,2))
        # Horizontal slot permits +/-1.4 mm centering relative to fixed boss.
        slot=union(cyl(1.7,4,(x-1.4,-30,z),(0,1,0)),cyl(1.7,4,(x+1.4,-30,z),(0,1,0)),box(2.8,4,3.4,x,-28,z-1.7))
        screenframe=screenframe.cut(slot)
    for x in (-18,18):
        for z in (26.5,66.5):
            screenframe=screenframe.fuse(box(2.0,2.7,4,x,-30.65,z-2))
            record(f'H04_LCD_edge_pad_{x}_{z}',box(2,.3,4,x,-32.15,z-2),'hardware','#545C59','silicone foam','0.3mm compliantPCB edge pad')
    for x in (-19.8,19.8):
        screenframe=screenframe.fuse(box(1.2,4.7,43,x,-31.65,24.75))
    for x in (-17,17):
        screenframe=screenframe.fuse(box(4,4.7,.7,x,-31.65,23.05))
        screenframe=screenframe.fuse(box(4,4.7,.7,x,-31.65,69.45))
    record('P04_Adjustable_display_carrier',screenframe,'printed','#567F7B','PETG','Slotted M3 carrier and0.3mm edge pads; provisional38x45.5 PCB; free header slot','Y')
    record('H05_LCD_perimeter_gasket',ring(18.9,17.2,1.1,(0,-36.6,FACE_Z),(0,1,0)),'hardware','#454D4A','silicone foam','Light compliant peripheral support outside active pixels; do not overtighten glass')

    # Upper electronics deck, open wiring corridors and snap-cap windows.
    deck=rr(73,37,2,4,y=1,z=44)
    for x,y in deck_mounts:
        deck=deck.fuse(cyl(4.6,2,(x,y,44)))
        if y>20: deck=deck.fuse(box(10,10,2,x,21,44))
        deck=deck.cut(hole_z(x,y,43.8,2.5,3.4))
    # Cable openings, keeping rails under each PCB.
    deck=deck.cut(rr(16,18,4,2,x=-2,y=-3,z=43))
    deck=deck.cut(rr(20,5,4,1,x=-5,y=13,z=43))
    deck=deck.cut(rr(16,11,4,1,x=26,y=17.8,z=43))
    # Module supports atPCB edges, no assumed mounting holes.
    for cx,cy,bw,bl in [(-25,0,18,22.5),(22,-4,18,19)]:
        for sx in (-1,1):
            deck=deck.fuse(box(1.2,bl-3,1.8,cx+sx*(bw/2-.8),cy,46))
            for sy in (-1,1):
                deck=deck.cut(box(1.5,4.4,3,cx+sx*10,cy+sy*7,43.5))
    record('P05_Electronics_deck',deck,'printed','#A0BBB5','PETG','Three-point removable deck; raised C3 antenna; PCB edge rails and snap-cap receivers')

    # Board snap caps, with 6.6 mm flexible arms, clearance around populated centres.
    for key,cx,cy,bl in [('P06_C3_snap_cap',-25,0,22.5),('P07_Amplifier_snap_cap',22,-4,19)]:
        cap=rr(22,bl+2,1.2,1,x=cx,y=cy,z=49.6).cut(box(16,bl-2,3,cx,cy,49.1))
        cap=cap.cut(box(11,6,3,cx,cy-bl/2,49.1))
        if key=='P06_C3_snap_cap':
            cap=cap.cut(box(6,1.5,3,cx,cy+9.9,49.1))
        for sx in (-1,1):
            for sy in (-1,1):
                xx=cx+sx*10
                yy=cy+sy*7
                leg=box(.8,3.4,6.7,xx,yy,43.0)
                if sx>0:
                    hook=xz_prism([(xx-.4,43),(xx+1.05,43.65),(xx+1.05,43.9),(xx-.4,43.9)],3.4,yy-1.7)
                else:
                    hook=xz_prism([(xx+.4,43),(xx-1.05,43.65),(xx-1.05,43.9),(xx+.4,43.9)],3.4,yy-1.7)
                cap=cap.fuse(leg).fuse(hook)
        record(key,cap,'printed','#456A66','PETG','Removable PCB-edge cap withfour integral latches; print flat frame down',features=['0.2mm pad clearance','6.6mm flexible arms','0.8mm arm thickness','0.3mm hook catch'])
        for sx in (-1,1):
            record(f'H07_{key}_pad_{sx}',box(1,bl-3,.2,cx+sx*8.5,cy,49.4),'hardware','#545C59','silicone foam','0.2mmPCB edge pad')

    # Power-module retaining bridge. No fastener goes through either purchased PCB.
    powerframe=None
    for cx,cy,bl in [(-20,-19,26),(19,-14,36)]:
        frame=rr(21,bl+4,1.8,1,x=cx,y=cy,z=7.2).cut(box(15,bl-2,3,cx,cy,6.7))
        powerframe=frame if powerframe is None else powerframe.fuse(frame)
    powerframe=powerframe.fuse(box(65,2.2,1.8,-.5,-33.3,7.2))
    powerframe=powerframe.cut(box(10,5,3,-20,-32,6.8))
    powerframe=powerframe.cut(cyl(4.5,3,(33,6,7)))
    for x in (-34,34):
        powerframe=powerframe.fuse(cyl(4.2,1.8,(x,-28.5,7.2)))
        powerframe=powerframe.fuse(box(8,8,1.8,x*.90,-30,7.2))
        powerframe=powerframe.cut(hole_z(x,-28.5,7,2.3,3.4))
    record('P08_Power_board_retainer',powerframe,'printed','#A0BBB5','PETG','M3 bridge restrains charger and boost PCB edges;0.4mm compliant edge pads')
    for cx,cy,bl in [(-20,-19,26),(19,-14,36)]:
        for sx in (-1,1):
            record(f'H08_Power_pad_{cx}_{sx}',box(1,bl-4,.4,cx+sx*8,cy,6.8),'hardware','#545C59','silicone foam','0.4mmPCB edge pad')

    # Replaceable battery cradle, no tight clamp on the cell. Allowance77x21x23 for purchased holder.
    cradle=rr(78,21.8,1.6,3,y=BAT_Y,z=4.7)
    # side rails only at central portion to clear curved case corners
    for yy in (9.45,32.55):
        cradle=cradle.fuse(box(63,1.3,4.8,0,yy,5.5))
    for xx in (-39.15,39.15):
        cradle=cradle.fuse(box(1.3,7.5,8,xx,BAT_Y,5.5))
    for x in (-33,33):
        cradle=cradle.fuse(cyl(4.2,1.8,(x,6,7.2)))
        cradle=cradle.fuse(box(8,4,1.8,x,8.5,7.2))
        cradle=cradle.cut(hole_z(x,6,4.5,2.7,8.4))
        cradle=cradle.cut(hole_z(x,6,4,8,3.4))
        cradle=cradle.cut(hole_z(x,6,9,4,6.4))
    # Tie slots are in extensions clear of the cell.
    for yy in (9.45,32.55):
        cradle=cradle.cut(box(8.8,3,1.3,0,yy,7.1))
    record('P09_Battery_cradle',cradle,'printed','#567F7B','PETG','Replaceable77.8x21.8 holder seat with8mm strap slots andM3 internal mounting')
    strap=cq.Workplane('YZ',origin=(-4,BAT_Y,17.2)).rect(26.5,27.2).extrude(8).edges('|X').fillet(2).val()
    strap_inner=cq.Workplane('YZ',origin=(-4.1,BAT_Y,17.2)).rect(24.9,25.6).extrude(8.2).edges('|X').fillet(1.2).val()
    record('H09_Battery_retaining_strap',strap.cut(strap_inner),'hardware','#4C5B60','hook-and-loop fabric','8mm x0.8 nominal strap routed below removable cradle; adjust tension to actual holder')

    # Top touch retaining frame. Only board edges contact the carrier.
    touch=rr(29,29,1.4,1,y=-3,z=66.8).cut(box(22,22,3,0,-3,66))
    for x in (-11.5,11.5):
        touch=touch.fuse(box(1,23,2.8,x,-3,68.2))
    for x in (-20,20):
        touch=touch.fuse(cyl(4.2,1.4,(x,-3,66.8))).fuse(box(7,6,1.4,x*.8,-3,66.8))
        touch=touch.cut(hole_z(x,-3,66,3,3.4))
    record('P10_Touch_retaining_frame',touch,'printed','#567F7B','PETG','24x24 provisional TTP223 board against1.4mm tap roof, backed atPCB edges')

    # Speaker cage leaves both diaphragm and wire exit clear. Compliant perimeter gasket.
    speakerframe=xz_plate(34,24,1.8,0,26.8,56,2).cut(xz_plate(26,16,3,0,26.2,56,1))
    for x,z in speaker_mounts:
        speakerframe=speakerframe.fuse(xz_plate(9,7,1.8,x*.92,26.8,z,1))
        speakerframe=speakerframe.cut(cyl(1.7,3,(x,26.3,z),(0,1,0)))
    speakerframe=speakerframe.cut(box(12,4,8,20,27.7,43))
    record('P11_Speaker_retainer',speakerframe,'printed','#567F7B','PETG','30x20x7 speaker cage, peripheral pads only; no diaphragm compression','Y')
    gasket=xz_plate(30,20,.8,0,35.8,56,1).cut(xz_plate(26,16,1,0,35.7,56,.5))
    record('H02_Speaker_gasket',gasket,'hardware','#373E41','closed-cell foam','0.8mm perimeter gasket')

    # Replaceable charge inlet tray, solder headers omitted to keep device small.
    usbtray=rr(25,19,1.6,3,x=-24,y=26,z=34).cut(box(16,12,3,-24,26,33.5))
    for x in (-32,-16):
        usbtray=usbtray.fuse(cyl(3.9,1.6,(x,12.5,34))).fuse(box(6,6,1.6,x,15.5,34))
        usbtray=usbtray.cut(hole_z(x,12.5,33.8,2.3,3.4))
    for x in (-35.6,-12.4):
        usbtray=usbtray.fuse(box(1.2,13,1.6,x,26,35.6))
    usbtray=usbtray.fuse(box(8,1.3,1.6,-24,16.15,35.6))
    record('P12_USB_inlet_carrier',usbtray.translate((0,0,1)),'printed','#567F7B','PETG','Replaceable USB-C breakout tray; provision22x18 PCB, external16x9 cable opening')
    usbcap=rr(25,19,1.2,3,x=-24,y=26,z=37.4).cut(box(19,15,3,-24,26,37))
    usbcap=usbcap.cut(box(12,6,3,-24,35,37))
    for x in (-32,-16):
        usbcap=usbcap.fuse(cyl(3.5,3,(x,12.5,35.6))).fuse(box(6,6,1.2,x,15.5,37.4))
        usbcap=usbcap.cut(hole_z(x,12.5,35.4,4,3.4))
    record('P13_USB_capture_cap',usbcap.translate((0,0,1)),'printed','#A0BBB5','PETG','Positive cable-insertion restraint; sharedM3x8 screws and0.2mmPCB edge pads')
    for x in (-34.5,-13.5):
        record('H06_USB_edge_pad_'+str(x),box(1,13,.2,x,26,38.2),'hardware','#545C59','silicone foam','0.2mm compliantUSBPCB edge pad')

    # Purchased components: envelopes, simplified but individual assembly members.
    pcb=box(38,1.6,45.5,0,-33.1,23.75)
    # circular glass plus lower flat tail envelope, panel dimension35.6x38.1x1.5
    panel=union(cyl(17.8,1.5,(0,-35.5,FACE_Z),(0,1,0)),box(20,1.5,3.6,0,-34.75,26.2))
    lcd=union(pcb,box(28,4,32,0,-30.3,30.5))
    record('E01_GC9A01_breakout_provisional',lcd,'electronics','#21589C','FR4/components','Tronic DM0049: provisional38x45.5x1.6 breakout; board identity must be measured')
    record('E02_LCD_panel_reference',panel,'electronics','#1D2528','glass','Elecrow panel35.6x38.1x1.5 reference; active32.4 diameter')
    # These are graphic display state markers, not physical pieces to manufacture.
    active=cyl(16.2,.08,(0,-35.58,FACE_Z),(0,1,0))
    record('V01_Display_active_area',active,'visual','#102328','pixels','32.4mm active display, visual representation only')
    for i,x in enumerate((-6.4,6.4),1):
        eye=xz_plate(4.4,8.2,.05,x,-35.65,FACE_Z+1,2.19)
        record(f'V0{i+1}_Eye_pixels',eye,'visual','#9DF1E0','pixels','Illustrative firmware expression, not a manufactured part')

    c3=box(18,22.5,1.6,-25,0,47.8)
    c3=c3.fuse(box(9,13,2,-25,0,49.4)).fuse(box(8.8,7,3.2,-25,-9.25,49.4))
    c3=c3.fuse(box(3,2,1.4,-25,9.5,49.4))
    record('E03_ESP32C3_SuperMini_A33',c3,'electronics','#2D3336','FR4/components','Alphatronic A33;22.5x18 PCB, other heights provisional; antenna towards+Y')
    amp=union(box(18,19,1.6,22,-4,47.8),box(8,10,1.4,22,-2,49.4),box(11,6,8.4,22,-10.5,49.4))
    record('E04_MAX98357_MD0860',amp,'electronics','#21589C','FR4/components','Tronic18x19 PCB; terminal block height provisional')
    sensor=union(box(24,24,1.6,0,-3,71.0),box(14,12,5.4,0,-3,65.6))
    record('E05_TTP223_MD0206_provisional',sensor,'electronics','#225590','FR4/components','Provisional24x24x7 module; sensing face atZ72.6')
    speaker=xz_plate(30,20,7,0,28.8,56,1)
    record('E06_3020_speaker_PAL36',speaker,'electronics','#30343A','speaker','Alphatronic PAL36; seller30x20x7,4ohm3W')
    # Charger envelope:26Y x17X, atfront-left. Native USB is internal service only.
    charger=union(box(17,26,1.6,-20,-19,5.2),box(10,14,2.2,-20,-17,6.8),box(8.8,6,3.2,-20,-29,6.8))
    record('E07_TP4056_MD0744',charger,'electronics','#245A9A','FR4/components','Tronic26x17 charger/protection PCB; populated height reserved6mm')
    boost=union(box(17,36,1.6,19,-14,5.2),box(10,10,12.4,19,-23,6.8),box(10,12,5,19,-8,6.8))
    record('E08_MT3608_ML2060',boost,'electronics','#235899','FR4/components','Duino36x17x14 module envelope; output must be set5V before connection')
    # Holder shell accommodates an assumed maximum cell, without pretending it is a manufacturer drawing.
    holder=box(77,21,23,0,BAT_Y,6.3)
    cavity=union(cyl(9.65,69.5,(-34.75,BAT_Y,17),(1,0,0)),box(69.5,19.3,30,0,BAT_Y,17))
    holder=holder.cut(cavity)
    record('E09_18650_holder_BA0039_provisional',holder,'electronics','#282D33','battery holder','Provision77x21x23; seller omits actual dimensions')
    cell=cyl(9.3,65.2,(-32.6,BAT_Y,17),(1,0,0))
    record('E10_18650_cell_BA0199_provisional',cell,'electronics','#537D65','Li-ion cell','Fit allowance diameter18.6x65.2; seller18x65 nominal, exact Samsung model unknown')
    # Spring contact envelopes (kept clear of the cell; connection compressed when assembled).
    for s in (-1,1):
        contact=cyl(4.5,.45,(s*34.0,BAT_Y,17),(1,0,0))
        record('H03_Cell_contact_'+('L' if s<0 else 'R'),contact,'hardware','#C4C8CE','spring steel','Holder contact envelope; spring detail not modelled')
    usb=box(22,18,1.6,-24,26,36.6)
    record('E11_USBC_MD0840_provisional',usb,'electronics','#30373C','FR4/components','Provision22x18 board; add separate5.1k Rd onCC1 andCC2 after checking board')
    socket=box(8.9,7.5,3.3,-24,32.8,38.2).cut(xz_plate(7.4,2.0,3,-24,34.5,39.85,.9))
    record('E13_USBC_socket_provisional',socket,'electronics','#A3ACB1','metal connector','Socket is part ofMD0840; its8.9x7.5x3.3 envelope is provisional, not separately purchased')
    # MTS202 total31mm alongY, body13x12, lever sweep is reserved separately.
    switch=union(box(13,10,12,26,18.6,33),cyl(3,6,(26,23.6,39),(0,1,0)),cyl(1.6,10,(26,29.6,39),(0,1,0)),box(9,5,7,26,11.1,35.5))
    record('E12_MTS202_BU0014_provisional',switch,'electronics','#636B73','switch','Approximate13x12x31; bushing/lever geometry andDC rating need received-part verification')
    record('H95_Toggle_washer_provisional',ring(4.6,3.2,.5,(26,25.7,39),(0,1,0)),'hardware','#BFC7CB','steel','Provisional switch washer; measure supplied hardware')
    nut=cq.Workplane('XZ',origin=(26,28.2,39)).polygon(6,8/math.cos(math.pi/6)).extrude(2).val().cut(cyl(3.1,2.4,(26,26,39),(0,1,0)))
    record('H96_Toggle_nut_provisional',nut,'hardware','#BFC7CB','steel','Provisional6mm-bushing nut,8mm across flats,2mm thick; use supplied switch nut')

    # Fasteners: each occurrence is named separately for a readable CAD assembly tree.
    for i,(x,y) in enumerate(lower_mounts,1):
        insert_z(f'H10_Base_insert_{i}',x,y,7.0,'P02_Snap_base')
        screw_z(f'H20_Base_screw_{i}',x,y,9.0,6)
    for i,(x,y) in enumerate(deck_mounts,1):
        insert_z(f'H30_Deck_insert_{i}',x,y,43.7,'P01_Upper_shell')
        screw_z(f'H40_Deck_screw_{i}',x,y,46,6)
    for i,(x,z) in enumerate(face_mounts,1):
        ins=ring(2.5,1.55,4,(x,-33.7,z),(0,1,0))
        record(f'H50_Display_insert_{i}',ins,'hardware','#B58B43','brass','M3x4x5 insert, axis+Y')
        INTENTIONAL.append([f'H50_Display_insert_{i}','P01_Upper_shell','Heat-set interference'])
        screw=union(cyl(1.48,6,(x,-33.3,z),(0,1,0)),cyl(3,2.4,(x,-27.3,z),(0,1,0)))
        record(f'H60_Display_screw_{i}',screw,'hardware','#616A71','steel','M3x6; use shim pads and centre LCD before tightening')
    for i,(x,z) in enumerate(speaker_mounts,1):
        ins=ring(2.5,1.55,4,(x,29.0,z),(0,1,0))
        record(f'H70_Speaker_insert_{i}',ins,'hardware','#B58B43','brass','M3x4x5 insert, axis+Y')
        INTENTIONAL.append([f'H70_Speaker_insert_{i}','P01_Upper_shell','Heat-set interference'])
        screw=union(cyl(1.48,6,(x,26.8,z),(0,1,0)),cyl(3,2.4,(x,24.4,z),(0,1,0)))
        record(f'H80_Speaker_screw_{i}',screw,'hardware','#616A71','steel','M3x6 simplified')
    for i,x in enumerate((-20,20),1):
        # Upward pointing screw; insert open from underside.
        insert_z(f'H90_Touch_insert_{i}',x,-3,72.6,'P01_Upper_shell')
        screw=union(cyl(1.48,6,(x,-3,66.8)),cyl(3,2.4,(x,-3,64.4)))
        record(f'H91_Touch_screw_{i}',screw,'hardware','#616A71','steel','M3x6 upward into top bosses')
    for i,x in enumerate((-32,-16),1):
        insert_z(f'H92_USB_insert_{i}',x,12.5,34.8,'P01_Upper_shell')
        screw_z(f'H93_USB_screw_{i}',x,12.5,39.6,8)
    for i,(x,y) in enumerate([(x,y) for x in(-29,29) for y in(-23,23)],1):
        record(f'H94_Rubber_foot_{i}',cyl(4.5,1.3,(x,y,-.7)),'hardware','#3E4A4B','silicone rubber','Adhesive diameter9x1.3 foot,0.6 recess')

    return PARTS


def make_coupons():
    # Insert bore trial piece includes four labelled holes, blind with2mm bottom.
    p=rr(44,14,7,2)
    for i,d in enumerate((4.3,4.4,4.5,4.6)):
        x=-16.5+i*11
        p=p.cut(hole_z(x,0,2,5.1,d))
    out=ROOT/'parts'/'coupons'; out.mkdir(parents=True,exist_ok=True)
    cq.exporters.export(p,str(out/'C01_Insert_bores_4p3_4p4_4p5_4p6.step'))
    cq.exporters.export(p,str(out/'C01_Insert_bores_4p3_4p4_4p5_4p6.stl'),tolerance=.035,angularTolerance=.08)
    # Real latch cross-section,20mm free length, plus mating block with0.35 catch.
    base=box(14,10,3,z=0)
    beam=box(1.2,6,20,0,0,3)
    hook=xz_prism([(-.6,21.5),(1.6,21.5),(1.6,22.2),(.6,24),(-.6,24)],6,-3)
    anchor=union(box(2.4,8,3.5,-.05,0,1.5),box(2.8,8,3,.65,0,2))
    sample=union(base,beam,hook,anchor)
    root_edges=[e for e in sample.Edges() if abs(e.Center().z-5)<1e-5 and abs(abs(e.Center().x)-.6)<1e-5 and 5.9<e.Length()<6.1]
    sample=cq.Workplane(obj=sample).newObject(root_edges).fillet(.4).val()
    receiver=box(2.4,10,8,2.45,0,19).cut(box(2.4,7,3.2,1.55,0,21.15))
    receiver=receiver.cut(box(5,5.6,1.8,3,0,22.1))
    cq.exporters.export(sample,str(out/'C02_Snap_latch.stl'),tolerance=.035,angularTolerance=.08)
    rec=receiver.translate((0,0,-19))
    cq.exporters.export(rec,str(out/'C03_Snap_receiver.stl'),tolerance=.035,angularTolerance=.08)
    # USB cable clearance coupon isolates uncertain socket and cable dimensions.
    port=box(24,3,16,z=0).cut(xz_plate(16,9,5,0,-2.5,8,2.3))
    cq.exporters.export(port,str(out/'C04_USB_clearance.stl'),tolerance=.035,angularTolerance=.08)


def export_all():
    assy=cq.Assembly(name='AURA_R1_MAIN_ASSEMBLY')
    groups={k:cq.Assembly(name=n) for k,n in [('printed','01_Printable_parts'),('electronics','02_Purchased_modules'),('hardware','03_Inserts_fasteners_pads'),('visual','04_Display_state_visual_only')]}
    manifest=[]
    for key,p in PARTS.items():
        category=p['category']; shape=p['shape']
        folder=ROOT/'parts'/category;folder.mkdir(parents=True,exist_ok=True)
        path=folder/(key+'.step')
        localassy=cq.Assembly(name=key).add(shape,name=key+'_solid',color=color(p['color']))
        localassy.save(str(path))
        groups[category].add(shape,name=key,color=color(p['color']))
        if category=='printed':
            printable=shape
            if p['print_axis']=='Y':
                printable=printable.rotate((0,0,0),(1,0,0),-90)
            # Caps are printed frame down so arms grow upwards.
            if key in ('P06_C3_snap_cap','P07_Amplifier_snap_cap'):
                printable=printable.rotate((0,0,0),(1,0,0),180)
            bb=printable.BoundingBox()
            printable=printable.translate((-bb.center.x,-bb.center.y,-bb.zmin))
            cq.exporters.export(printable,str(folder/(key+'.stl')),tolerance=.035,angularTolerance=.08)
        b=shape.BoundingBox()
        manifest.append(dict(id=key,category=category,file=str(path.relative_to(ROOT)).replace('\\','/'),
            material=p['material'],description=p['description'],color=p['color'],
            bounds_mm=[round(v,4) for v in [b.xmin,b.ymin,b.zmin,b.xmax,b.ymax,b.zmax]],
            volume_mm3=round(shape.Volume(),3),solid_count=len(shape.Solids()),valid=shape.isValid(),
            features=FEATURES[key]))
    for g in groups.values(): assy.add(g)
    assy.save(str(ROOT/'Aura_R1_Main_Assembly.step'))
    assy.save(str(ROOT/'exports'/'Aura_R1_Main_Assembly.glb'),tolerance=.12,angularTolerance=.18)
    # Exploded view is a separate review assembly, not a substitute for the assembled model.
    exploded=cq.Assembly(name='AURA_R1_EXPLODED_REVIEW')
    for key,p in PARTS.items():
        shift=(0,0,0)
        if key=='P01_Upper_shell': shift=(0,0,100)
        elif key=='P02_Snap_base': shift=(0,0,-26)
        elif key in ('P03_Face_bezel','H01_Bezel_adhesive'): shift=(0,-55,15)
        elif key=='P04_Adjustable_display_carrier' or key.startswith(('E01','E02','V0')): shift=(0,-28,15)
        elif key in ('P10_Touch_retaining_frame','E05_TTP223_MD0206_provisional'): shift=(0,0,58)
        elif key in ('P11_Speaker_retainer','E06_3020_speaker_PAL36','H02_Speaker_gasket'): shift=(0,35,18)
        elif key.startswith(('P05','P06','P07','E03','E04')): shift=(0,0,22)
        elif key.startswith(('E09','E10')): shift=(0,0,7)
        exploded.add(p['shape'],loc=cq.Location(cq.Vector(*shift)),name=key,color=color(p['color']))
    exploded.save(str(ROOT/'exports'/'Aura_R1_Exploded.step'))
    (ROOT/'research'/'assembly_manifest.json').write_text(json.dumps({'units':'mm','axes':{'front':'-Y','up':'+Z'},'parts':manifest,'intentional_interference':INTENTIONAL},indent=2),encoding='utf-8')
    with (ROOT/'research'/'part_dimensions.csv').open('w',newline='',encoding='utf-8-sig') as f:
        wr=csv.writer(f);wr.writerow(['Part','Category','SizeX_mm','SizeY_mm','SizeZ_mm','Material','Description'])
        for row in manifest:
            b=row['bounds_mm'];wr.writerow([row['id'],row['category'],round(b[3]-b[0],3),round(b[4]-b[1],3),round(b[5]-b[2],3),row['material'],row['description']])
    make_coupons()
    print('EXPORTED',len(manifest),'parts',flush=True)


def validate():
    intended={frozenset(p[:2]):p[2] for p in INTENTIONAL}
    unexpected=[]; expected=[]; minimum=[]
    keys=[k for k,p in PARTS.items() if p['category']!='visual']
    for i,a in enumerate(keys):
        sa=PARTS[a]['shape'];ba=sa.BoundingBox()
        for b in keys[i+1:]:
            sb=PARTS[b]['shape'];bb=sb.BoundingBox()
            if ba.xmax<bb.xmin or bb.xmax<ba.xmin or ba.ymax<bb.ymin or bb.ymax<ba.ymin or ba.zmax<bb.zmin or bb.zmax<ba.zmin: continue
            collision=sa.intersect(sb)
            volume=collision.Volume()
            if volume>.025:
                cb=collision.BoundingBox()
                row={'a':a,'b':b,'volume_mm3':round(volume,4),'bounds_mm':[round(v,3) for v in (cb.xmin,cb.ymin,cb.zmin,cb.xmax,cb.ymax,cb.zmax)]}
                if frozenset((a,b)) in intended:
                    row['reason']=intended[frozenset((a,b))];expected.append(row)
                else: unexpected.append(row)
    checks={
        'all_parts_valid':all(p['shape'].isValid() for p in PARTS.values()),
        'printable_parts_single_solid':all(len(p['shape'].Solids())==1 for p in PARTS.values() if p['category']=='printed'),
        'unexpected_interferences':unexpected,'intentional_heatset_interferences':expected,
        'snap_nominal':{'beam_nominal_free_length_mm':16.5,'conservative_length_after_root_radius_mm':16.1,'root_radius_mm':.4,'thickness_mm':1.2,'width_mm':6,'nominal_required_deflection_mm':.35,'design_deflection_with_tolerance_mm':.7,'strain_estimate_percent':round(100*1.5*1.2*.7/(16.1**2),3),'note':'Elastic beam estimate only, excludes root/local/layer effects; print coupon required'},
        'physical_validation':'NOT PERFORMED. No hardware measurements, charging, thermal, radio or printed latch tests.',
        'revision':'R1 engineering prototype; measurement-dependent supplier envelopes remain provisional'
    }
    (ROOT/'research'/'validation.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    print('UNEXPECTED_INTERFERENCES',len(unexpected),flush=True)
    for row in unexpected: print(row,flush=True)
    return checks


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--no-export',action='store_true');args=parser.parse_args()
    build()
    if not args.no_export: export_all()
    validate()
