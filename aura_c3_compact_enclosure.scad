// Compact Aura C3 desk buddy, USB-powered prototype. Millimetres.
// Set part to "shell" or "base" and export each STL separately.
part = "layout"; // "shell", "base", "layout"
$fn = 64;

W=84; D=80; H=53;
wall=3; floor_t=4; fit=0.45;
boss_xy=[[-33,-29],[-33,29],[33,-29],[33,29]];

module rr(w,d,r) { offset(r=r) square([w-2*r,d-2*r],center=true); }
module section(w,d,r,z) {
    translate([0,0,z]) linear_extrude(0.1) rr(w,d,r);
}
module outside() {
    hull() {
        section(W,D,18,4);
        section(W,D,18,43);
        section(76,72,16,H-0.1);
    }
}
module inside() {
    hull() {
        section(78,74,15,3.9);
        section(78,74,15,42);
        section(70,66,13,49);
    }
}
module boss(x,y) {
    // Rib joins boss to side wall; all sections overlap by >1 mm.
    hull() {
        translate([x,y,4]) cylinder(h=11,d=7.5);
        translate([(x<0 ? -38.2 : 38.2),y,4]) cylinder(h=11,d=4.5);
    }
}

module speaker_ring() {
    // Rear-facing Ø39.4 speaker. Cylinder axis is -Y.
    translate([0,38.5,26]) rotate([90,0,0]) difference() {
        cylinder(h=4.5,d=43);
        translate([0,0,-0.1]) cylinder(h=4.7,d=35);
    }
}
module display_lands() {
    // Generic 40.4 × 37.5 mm GC9A01 PCB at (-14,-10).
    for (x=[-33,5],y=[-27,7])
        translate([x,y,46]) cylinder(h=4,d=4.5);
}
module shell_cuts() {
    // Ø32.4 active circular display, with modest printed clearance.
    translate([-14,-10,46]) cylinder(h=8,d=33.2);
    translate([-14,-10,51.6]) cylinder(h=1.5,d1=33.2,d2=34.8);

    // TTP223 local underside pocket leaves a 1.5 mm roof at z=53.
    translate([24,-13,48.5]) linear_extrude(3) rr(19,19,3);

    // Rear grille, 2.2 mm bores at 5 mm pitch, within Ø36 acoustic circle.
    for (x=[-3:3], z=[-3:3])
        if (x*x+z*z <= 10)
            translate([5*x,41,26+5*z]) rotate([90,0,0])
                cylinder(h=8,d=2.2);

    // Native USB-C on the SuperMini: front opening, connector-specific trim.
    translate([-22,-41,6]) cube([14,8,10]);

    // Optional passive NTAG213 sticker recess on right side, no MCU wiring.
    translate([41.3,-20.5,15]) cube([3,41,26]);
}
module shell() {
    difference() {
        union() {
            difference() { outside(); inside(); }
            for (p=boss_xy) boss(p[0],p[1]);
            speaker_ring();
            display_lands();
        }
        shell_cuts();
        for (p=boss_xy)
            translate([p[0],p[1],3.9]) cylinder(h=11.2,d=1.65);
    }
}

module base() {
    difference() {
        union() {
            linear_extrude(floor_t) rr(W,D,18);
            // Tongue is segmented around the four screw bosses.
            translate([0,0,4]) linear_extrude(3)
                difference() {
                    rr(78-2*fit,74-2*fit,14.5);
                    rr(70,66,12);
                    for (p=boss_xy)
                        translate([p[0],p[1]]) square([17,15],center=true);
                    // Clear the front USB connector and cable shell.
                    translate([-15,-35]) square([18,10],center=true);
                }
            // Low pads for approximate 24 × 20 mm SuperMini PCB.
            for (x=[-26,-4],y=[-33,-13])
                translate([x,y,4]) cylinder(h=3,d=4.5);
            // Low amp guides for approximate 20 × 18 mm breakout.
            for (x=[2,27],y=[-30,-7])
                translate([x,y,4]) cylinder(h=2,d=3);
        }
        for (p=boss_xy) {
            translate([p[0],p[1],-0.1]) cylinder(h=4.3,d=2.2);
            translate([p[0],p[1],-0.1]) cylinder(h=2.4,d=4.2);
        }
    }
}

if (part=="shell") shell();
else if (part=="base") base();
else {
    translate([-49,0,0]) shell();
    translate([49,0,0]) base();
}
