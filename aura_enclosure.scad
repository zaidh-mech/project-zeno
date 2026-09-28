// Aura enclosure, prototype revision A. All dimensions in millimetres.
// Render one part at a time: set part = "top" or "base" and export STL.
part = "layout"; // "top", "base", or "layout"
$fn = 64;

// Shell envelope and fit parameters
W = 132; D = 112; H = 62;
wall = 3; floor_t = 4;
clearance = 0.5; // radial clearance between base tongue and shell cavity
screw_d = 2.2; pilot_d = 1.65; // M2 self-tapping pilot; tune for print process

module rr(w,d,r) {
    offset(r=r) square([w-2*r,d-2*r], center=true);
}
module slice(w,d,r,z,t=0.1) {
    translate([0,0,z]) linear_extrude(t) rr(w,d,r);
}
module outer() {
    hull() {
        slice(W,D,22,4);
        slice(W,D,22,46);
        slice(118,98,19,H-0.1);
    }
}
module cavity() {
    hull() {
        slice(W-2*wall,D-2*wall,19,3.9);
        slice(W-2*wall,D-2*wall,19,42);
        slice(108,88,16,55);
    }
}

// Shell screws sit outboard of the cell, LCD, and loudspeaker envelopes.
boss_xy = [[-55,-38],[-55,38],[55,-38],[55,38]];
module boss(x,y) {
    // The round boss is inside the cavity, so bridge it into the side wall.
    // At y=+/-38 the inner wall starts at about x=+/-62.6.
    hull() {
        translate([x,y,4]) cylinder(h=13,d=9);
        translate([(x < 0 ? -62.5 : 62.5),y,4]) cylinder(h=13,d=6);
    }
}
module boss_pilot(x,y) {
    translate([x,y,3.9]) cylinder(h=13.2,d=pilot_d);
}

// Light-catching screen bevel: aperture Ø33.2 to accept measured Ø32.4 face.
module openings() {
    translate([-24,-17,54.5]) cylinder(h=8,d=33.2);
    translate([-24,-17,60.5]) cylinder(h=1.7,d1=33.2,d2=35.5);

    // Local underside pocket creates a 1.5 mm capacitive-touch roof.
    translate([28,-32,54]) linear_extrude(6.5) rr(21,21,3);

    // Speaker Ø40, at (29,18); 2.5 mm holes on a 5 mm pitch.
    for (x=[-3:3], y=[-3:3])
        if ((x*x+y*y) <= 10)
            translate([29+5*x,18+5*y,54]) cylinder(h=9,d=2.5);

    // Bottom-port INMP441: Ø1.5 acoustic bore at front, away from speaker.
    translate([8,-57,31]) rotate([-90,0,0]) cylinder(h=9,d=1.5);

    // Rear charger USB-C opening, oversized for generic TP4056 boards.
    translate([-6,-0+49,9]) cube([12,12,8]);
    // Rear SPST slide switch access; adapt to the purchased switch.
    translate([26,49,26]) cube([14,12,7]);

    // Side NFC pocket 41 x 26 x ~0.8 mm. Sticker adheres to recessed face.
    translate([65.2,-23,19]) cube([4,41,26]);
}

// A speaker gasket bonds at its outer frame; keep the diaphragm unrestricted.
module speaker_landing() {
    translate([29,18,51]) difference() {
        // Extend 1 mm into the crown, avoiding a face-only join at z=55.
        cylinder(h=5,d=44);
        translate([0,0,-0.1]) cylinder(h=5.2,d=36);
    }
}

// Board rails: 65 x 29 nominal DevKit PCB centered on (-29,16).
// Thin VHB foam or removable nylon ties hold the board on these horizontal lips.
// Rail top is z=29; PCB underside faces down, USB ports face rear (+Y).
module devkit_rails() {
    for (x=[-47,-11]) {
        translate([x,16,28]) cube([4,67,2],center=true);
        for (y=[-13,45])
            // Crown-connected hangers; lower ends at z=14.5, upper at z=57.
            translate([x,y,35.75]) cube([4,5,42.5],center=true);
    }
}

// Adhesive landing for amplifier and hook for wire restraint near speaker.
module amp_landing() {
    translate([17,-15,26]) cube([24,22,2],center=true);
    // Connect the pad through the crown (z=55), not just into free space.
    translate([17,-15,42]) cube([5,5,30],center=true);
}

// Four slender side supports for the LCD PCB. Trim / shim to the actual
// glass-to-PCB offset; avoid loading the glass. PCB nominal 40.4 x 37.5.
module display_lands() {
    for (x=[-44,-4],y=[-33,-1])
        translate([x,y,52.5]) cylinder(h=3.5,d=5);
}

module top_shell() {
    difference() {
        union() {
            difference() { outer(); cavity(); }
            for (p=boss_xy) boss(p[0],p[1]);
            speaker_landing();
            devkit_rails();
            amp_landing();
            display_lands();
        }
        openings();
        for (p=boss_xy) boss_pilot(p[0],p[1]);
    }
}

// Base battery bay: 38 x 66 x 8 usable, centered on (-29,17).
// Cell lies on soft foam. No screws or hard ribs cross its 34 x 62 x 5 body.
module battery_guides() {
    for (x=[-49,-9]) translate([x,17,4]) cube([2,68,4],center=true);
    for (y=[-17,51]) translate([-29,y,4]) cube([40,2,4],center=true);
}
module base() {
    difference() {
        union() {
            linear_extrude(floor_t) rr(W,D,22);
            // Tongue enters the shell with 0.5 mm radial clearance.
            translate([0,0,4]) linear_extrude(3)
                difference() {
                    rr(W-2*wall-2*clearance,D-2*wall-2*clearance,18.5);
                    rr(W-2*wall-8,D-2*wall-8,15);
                    // Tongue clears the wall-tied screw bosses and their ribs.
                    for (p=boss_xy)
                        translate([p[0],p[1]]) square([24,16],center=true);
                }
            battery_guides();
            // Anti-slip pad seats outside the battery zone.
            for (x=[-44,44],y=[-36,36])
                translate([x,y,-0.6]) cylinder(h=0.9,d=9);
        }
        for (p=boss_xy) {
            translate([p[0],p[1],-0.1]) cylinder(h=4.3,d=screw_d);
            translate([p[0],p[1],-0.1]) cylinder(h=2.3,d=4.2);
        }
    }
}

if (part == "top") top_shell();
else if (part == "base") base();
else {
    translate([-76,0,0]) top_shell();
    translate([76,0,0]) base();
}
