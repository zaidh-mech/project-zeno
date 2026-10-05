"""Draw the firmware-matched wiring and audit its electrical connectivity.

PDF is vector artwork. PNGs are rendered from the delivered PDF, not substitutes
for it. The module symbols on sheets1/2 are functional, not physical pin order.
"""
from __future__ import annotations
import csv
import html
import json
from pathlib import Path
import re
import textwrap
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
import fitz
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
INK = '#254441'
LIGHT = '#edf3ed'
GREEN = '#347d67'
RED = '#c44237'
BROWN = '#ad762d'
GREY = '#35414b'
BLUE = '#3474a0'
PURPLE = '#8d539b'
WIDTH, HEIGHT = landscape(A4)
DATA = json.loads((ROOT / 'research/wiring.json').read_text('utf-8'))


def readable(text):
    return re.sub(r'\b([A-Z]?[a-z]{2,})(?=\d)', r'\1 ', text)


class Sheet:
    def __init__(self, c, number, title, subtitle):
        self.c, self.number = c, number
        c.setFillColor(colors.white)
        c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
        self.text(30, 556, title, 20, bold=True)
        self.text(30, 534, subtitle, 9, color=GREY)
        self.line([(30, 524), (WIDTH-30, 524)], '#ced8cf', .8)

    def text(self, x, y, text, size=9, color=INK, bold=False, align='left'):
        text=readable(text)
        font = 'Helvetica-Bold' if bold else 'Helvetica'
        self.c.setFont(font, size)
        self.c.setFillColor(colors.HexColor(color))
        width = stringWidth(text, font, size)
        left = x-width if align == 'right' else (x-width/2 if align == 'center' else x)
        assert left >= 15 and left+width <= WIDTH-15, ('Text outside page', text, left, width)
        self.c.drawString(left, y, text)

    def para(self, x, y, text, width, size=9, leading=13, color=INK, bold=False):
        text=readable(text)
        font = 'Helvetica-Bold' if bold else 'Helvetica'
        lines = []
        for paragraph in text.split('\n'):
            words = paragraph.split()
            line = ''
            for word in words:
                attempt = (line+' '+word).strip()
                if line and stringWidth(attempt, font, size) > width:
                    lines.append(line)
                    line = word
                else: line = attempt
            lines.append(line)
        for line in lines:
            self.text(x, y, line, size, color, bold)
            y -= leading
        return y

    def line(self, points, color=INK, width=1.2, dash=None):
        self.c.setStrokeColor(colors.HexColor(color))
        self.c.setLineWidth(width)
        self.c.setDash(dash or [])
        path = self.c.beginPath()
        path.moveTo(*points[0])
        for p in points[1:]: path.lineTo(*p)
        self.c.drawPath(path)
        self.c.setDash([])

    def dot(self, x, y, color=INK, radius=2.2):
        self.c.setFillColor(colors.HexColor(color))
        self.c.setStrokeColor(colors.HexColor(color))
        self.c.circle(x, y, radius, stroke=1, fill=1)

    def box(self, x, y, w, h, title, subtitle='', fill=LIGHT):
        self.c.setFillColor(colors.HexColor(fill))
        self.c.setStrokeColor(colors.HexColor(GREEN))
        self.c.setLineWidth(.9)
        self.c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
        self.text(x+w/2, y+h-18, title, 11, bold=True, align='center')
        if subtitle: self.text(x+w/2, y+h-31, subtitle, 8, align='center')

    def pin(self, x, y, label, side='left', color=INK, size=9):
        sign = -1 if side == 'left' else 1
        self.line([(x, y), (x+sign*8, y)], color)
        self.dot(x+sign*8, y, color, 1.5)
        self.text(x-sign*10, y-3, label, size, color, align='left' if sign<0 else 'right')
        return x+sign*8, y

    def rail(self, x, y, name, color=INK, align='left'):
        self.dot(x, y, color, 1.8)
        self.text(x+5 if align=='left' else x-5, y-3, name, 8, color, bold=True, align=align)

    def open(self, x, y, color=GREY):
        self.line([(x-3, y-3), (x+3, y+3)], color, .9)
        self.line([(x-3, y+3), (x+3, y-3)], color, .9)

    def footer(self, note):
        self.line([(30, 52), (WIDTH-30, 52)], '#ced8cf', .7)
        self.text(30, 36, 'AURA R1 / W1 / 2026-10-01', 8, bold=True)
        self.text(WIDTH-30, 36, f'SHEET {self.number} / 4', 8, align='right')
        self.text(30, 21, note, 7.5, color=GREY)
        self.c.showPage()


def signal_sheet(c):
    p = Sheet(c, 1, 'AURA / SIGNALS & MODULE POWER', 'Functional schematic: match the labelled pads. Physical header orientations are on Sheet3.')
    p.box(235, 93, 165, 413, 'ESP32-C3 SuperMini', 'Alphatronic A33 / firmware C3')
    for y, label, net, color in [(474, '5V', 'SYS_5V', RED), (444, '3V3 OUT', 'V3V3', BROWN), (414, 'GND', 'PGND', GREY)]:
        end = p.pin(235, y, label, color=color)
        p.line([end, (172, y)], color)
        p.rail(172, y, net, color, 'right')
    p.para(35, 349, 'SYS_5V is the switched 5.0V rail from Sheet2.\n\nV3V3 is the C3 regulator output, not a second input.\n\nAll I/O is 3.3V. Keep GPIO18/19 for native USB. Leave GPIO2/8/9 free of new straps.', 165, 9, 13)
    p.box(572, 318, 163, 188, 'GC9A01 LCD', 'Tronic DM0049 / 3.3V only')
    ys = [470, 443, 416, 389, 362]
    for row, y in zip(DATA['signals'][:5], ys):
        a = p.pin(400, y, row['mcu'], 'right', GREEN)
        b = p.pin(572, y, row['pin'], 'left', GREEN)
        p.line([a, b], GREEN)
        p.text((a[0]+b[0])/2, y+5, row['net'].replace('LCD_', ''), 7.5, GREEN, align='center')
    for y, label, net, color in [(457, 'VCC', 'V3V3', BROWN), (430, 'GND', 'PGND', GREY)]:
        a=p.pin(735, y, label, 'right', color)
        p.line([a, (763, y)], color)
        p.rail(763, y, net, color)
    p.text(580, 334, 'SCL/SDA are SPI clock/data.', 8)
    p.box(572, 149, 163, 161, 'MAX98357A', 'Tronic MD0860 / I2S left')
    for idx, y in zip((6, 7, 8), (274, 244, 214)):
        row=DATA['signals'][idx]
        a=p.pin(400, y, row['mcu'], 'right', BLUE)
        b=p.pin(572, y, row['pin'], 'left', BLUE)
        p.line([a, b], BLUE)
    for y, label, net, color in [(277, 'Vin', 'SYS_5V', RED), (250, 'GND', 'PGND', GREY), (223, 'SD', 'V3V3', BROWN)]:
        a=p.pin(735, y, label, 'right', color)
        p.line([a, (763, y)], color)
        p.rail(763, y, net, color)
    a=p.pin(572, 181, 'GAIN', color=GREY)
    p.line([a, (552, 181)], GREY)
    p.open(552, 181)
    p.text(420, 177, 'OPEN = 9dB', 8, GREY)
    p.box(773, 144, 42, 67, 'SPK', fill='#fff6e9')
    for ay, sy, label, colour in [(178, 178, '+', RED), (157, 157, '-', PURPLE)]:
        a=p.pin(735, ay, 'SPK'+label, 'right', colour, 8)
        b=p.pin(773, sy, label, 'left', colour, 8)
        p.line([a, b], colour)
    p.text(794, 131, '4 ohm / 3W', 7.5, align='center')
    p.box(572, 73, 163, 62, 'TTP223')
    a=p.pin(400, 103, 'GPIO20', 'right', PURPLE)
    b=p.pin(572, 92, 'SIG', 'left', PURPLE)
    p.line([a, (490, 103), (490, 92), b], PURPLE)
    p.text(583, 79, 'MD0206 / active high', 7.5)
    for y, label, net, color in [(111, 'VCC', 'V3V3', BROWN), (85, 'GND', 'PGND', GREY)]:
        a=p.pin(735, y, label, 'right', color, 8)
        p.line([a, (763, y)], color)
        p.rail(763, y, net, color)
    p.para(30, 138, 'Same rail name = same electrical net, including across sheets.\nSD to3V3 selects LEFT; speaker connects across + and - only.\nNo microphone module; the Android phone supplies microphone input.', 190, 8.5, 12)
    p.footer('GPIO numbers are firmware GPIO labels, not chip-package pin numbers. Check received-board silk before soldering.')


def resistor(p, x, y, label):
    p.line([(x, y+20), (x, y+12)], BROWN)
    p.c.setFillColor(colors.white)
    p.c.setStrokeColor(colors.HexColor(BROWN))
    p.c.rect(x-4, y-5, 8, 17, fill=1, stroke=1)
    p.line([(x, y-5), (x, y-18)], BROWN)
    p.text(x+9, y+2, label, 8, BROWN)
    p.rail(x, y-18, 'PGND', GREY, 'right')


def power_sheet(c):
    p=Sheet(c, 2, 'AURA / BATTERY & USB-C CHARGING', 'Functional schematic. Switch blades shown in RUN; open crosses are intentionally unconnected terminals.')
    p.box(35, 356, 165, 147, 'USB-C inlet', 'MD0840 / HW-139 / 5V only')
    a=p.pin(200, 454, 'VCC x2', 'right', RED)
    p.line([a, (286, 454)], RED)
    p.text(214, 465, 'USB_CHARGE_5V', 8, RED)
    a=p.pin(200, 423, 'GND x2', 'right', GREY)
    p.line([a, (219, 423)], GREY)
    p.rail(219, 423, 'PGND', GREY)
    p.text(46, 392, 'DP/DN/SBU: leave open', 8)
    for x, name in ((65, 'CC1'), (135, 'CC2')):
        p.text(x, 366, name, 8, align='center')
        p.line([(x, 356), (x, 344)], BROWN)
        resistor(p, x, 324, '5.1k')
    p.text(35, 282, 'One total5.1k per CC pin; do not duplicate fitted Rd.', 8)
    # Logical SPDT sections of a single DPDT; never imply physical lug numbers.
    common_b=(349, 425)
    charge=(286, 454)
    unused_b=(286, 399)
    for xy in (common_b, charge, unused_b): p.dot(*xy)
    p.line([common_b, unused_b], GREY)
    p.open(*unused_b)
    p.text(277, 477, 'B_CHARGE', 8)
    p.text(261, 383, 'B_UNUSED', 8)
    p.text(344, 409, 'B_COMMON', 8)
    p.text(282, 503, 'S1 / POLE B', 10, bold=True)
    p.box(474, 318, 155, 185, 'TP4056 + protection', 'Tronic MD0744')
    b=p.pin(474, 425, 'IN+ (printed +)', color=RED, size=8)
    p.line([common_b, b], RED)
    b=p.pin(474, 395, 'IN- (printed -)', color=GREY, size=8)
    p.line([b, (445, 395)], GREY)
    p.rail(445, 395, 'PGND', GREY, 'right')
    p.box(722, 352, 91, 151, 'MT3608', 'Duino ML2060')
    a=p.pin(629, 452, 'OUT+', 'right', RED)
    b=p.pin(722, 452, 'VIN+', color=RED, size=8)
    p.line([a, b], RED)
    a=p.pin(722, 425, 'VIN-', color=GREY, size=8)
    p.line([a, (706, 425)], GREY)
    p.rail(706, 425, 'PGND', GREY, 'right')
    a=p.pin(722, 394, 'VOUT-', color=GREY, size=8)
    p.line([a, (706, 394)], GREY)
    p.rail(706, 394, 'PGND', GREY, 'right')
    a=p.pin(474, 338, 'OUT-', 'left', GREY)
    p.line([a, (445, 338)], GREY)
    p.rail(445, 338, 'PGND', GREY, 'right')
    p.box(474, 198, 155, 83, 'One18650 + holder', 'B1 / BA0199 + BA0039')
    for y1,y2,label,colour,x in [(420, 239, 'B+', RED, 684), (388, 217, 'B-', PURPLE, 663)]:
        a=p.pin(629, y1, label, 'right', colour)
        b=p.pin(629, y2, '+' if label=='B+' else '-', 'right', colour)
        p.line([a, (x, y1), (x, y2), b], colour)
    p.text(487, 181, 'CELL_NEG: not PGND', 8, PURPLE)
    a=p.pin(722, 365, 'VOUT+', color=RED, size=8)
    # Carry the boost rail below the cell to the separate RUN pole.
    p.line([a, (708, 365), (708, 151), (458, 151)], RED)
    p.text(714, 292, 'Set output', 8, RED)
    p.text(714, 279, 'to5.0V first', 8, RED)
    p.text(552, 159, 'BOOST_5V', 8, RED)
    common_a=(382, 124)
    run=(458, 151)
    unused_a=(458, 98)
    for xy in (common_a,run,unused_a): p.dot(*xy)
    p.line([common_a, run], GREY)
    p.open(*unused_a)
    p.text(417, 175, 'S1 / POLE A', 10, bold=True)
    p.text(457, 135, 'A_RUN', 8)
    p.text(457, 83, 'A_UNUSED', 8)
    p.text(299, 108, 'A_COMMON', 8)
    p.line([common_a, (196, 124)], RED)
    p.rail(196, 124, 'SYS_5V -> C3 5V + AMP Vin', RED, 'right')
    p.para(36, 245, 'ONE mechanically linked DPDT\nRUN: system on; charging input open.\nCHARGE: system off; USB feeds charger.\nBoth poles must switch together.\nIdentify actual lugs by continuity.', 345, 10, 16)
    p.para(36, 76, 'Replace the existing RPROG with3.0k (IC pin2 PROG to pin3 GND); expected367-400mA, measure actual.\nPGND = OUT-/IN-; only the cell negative goes to B-. Booster stays attached and consumes idle current.', 760, 8.5, 12)
    p.footer('Use the external inlet to charge. Charger native USB stays unused. Programming USB: CHARGE first; unplug before RUN.')


def header_row(p, x, y, width, names, mappings):
    pitch=width/(len(names)-1)
    for i,(name,mapping) in enumerate(zip(names,mappings)):
        xx=x+i*pitch
        p.line([(xx,y+11),(xx,y)],GREEN,.8)
        p.dot(xx,y, GREEN, 2.3)
        p.text(xx,y-16,name,8, bold=True, align='center')
        p.text(xx,y-30,mapping,7.5, align='center')


def physical_sheet(c):
    p=Sheet(c, 3, 'AURA / EXACT HEADER LABELS', 'Views below are explicitly named. Reversing the board reverses the apparent left/right pin order.')
    p.text(33, 497, 'C3 / COMPONENT FACE / USB AT TOP', 10, bold=True)
    p.text(33, 481, 'Nologo reference; verify actual A33 silk.', 8, color=GREY)
    p.box(72, 230, 143, 238, '', fill='#e3eeec')
    p.c.setStrokeColor(colors.HexColor(GREY))
    p.c.roundRect(123, 451, 40, 20, 3, fill=0, stroke=1)
    p.text(143, 456, 'USB', 8, align='center')
    left=DATA['header_reference']['C3']['left_top_to_bottom']
    right=DATA['header_reference']['C3']['right_top_to_bottom']
    for i,(l,r) in enumerate(zip(left,right)):
        y=426-i*23
        p.dot(73,y);p.dot(214,y)
        p.text(65,y-3,l,8,align='right')
        p.text(222,y-3,r,8)
    p.text(143, 246, 'REFERENCE VIEW', 7.5, align='center')
    p.para(33, 205, '5V is supply input;3V3 is regulator output. Native USB is GPIO18/19 internally. GPIO20 also serves UART0 RX; use native USB for programming.', 223, 8.5, 12)
    p.text(299, 497, 'LCD / BACK-COMPONENT FACE', 10, bold=True)
    p.text(299, 481, 'DM0049 / header at bottom', 8, color=GREY)
    p.box(293, 376, 218, 92, '', fill='#e7eff3')
    p.c.setStrokeColor(colors.HexColor(GREEN))
    p.c.circle(402,426,34,stroke=1,fill=0)
    header_row(p,306,365,192,DATA['header_reference']['LCD']['left_to_right'],['3V3','PGND','GPIO4','GPIO6','GPIO5','GPIO7','GPIO3'])
    p.para(299, 316, 'The display/front face reverses this order. This seven-pin board has no separate BL pad in the documented header.', 214, 8.5, 12)
    p.text(553, 497, 'AMPLIFIER / COMPONENT FACE', 10, bold=True)
    p.text(553, 481, 'MD0860 / header at bottom', 8, color=GREY)
    p.box(549, 376, 258, 92, '', fill='#e7eff3')
    p.dot(635,453,PURPLE,3);p.dot(717,453,RED,3)
    p.text(635,436,'SPK-',8,align='center');p.text(717,436,'SPK+',8,align='center')
    p.text(676, 412, 'Neither speaker terminal is ground.', 8, align='center')
    header_row(p,561,365,235,DATA['header_reference']['AMP']['left_to_right'],['GPIO1','GPIO0','GPIO10','OPEN','3V3','PGND','5V'])
    p.para(553, 316, 'SD to3V3 forces LEFT audio. GAIN open =9dB, if no board strap is fitted. Verify straps before changing gain.', 247, 8.5, 12)
    p.text(299, 252, 'TOUCH / COMPONENT FACE', 10, bold=True)
    p.text(299, 237, 'MD0206 / header at top', 8, color=GREY)
    p.box(315, 91, 180, 124, '', fill='#e7eff3')
    # Top-header labels sit above the pins; mappings below.
    for xx,name,mapping in zip((349,405,461),('SIG','VCC','GND'),('GPIO20','3V3','PGND')):
        p.dot(xx,205,GREEN,2.3)
        p.text(xx,218,name,8,bold=True,align='center')
        p.text(xx,191,mapping,8,align='center')
    p.c.circle(405,135,25,stroke=1,fill=0)
    p.text(405,131,'TOUCH',8,align='center')
    p.text(299, 75, 'Use active-high momentary output.', 8)
    p.para(553, 245, 'TERMINAL NAMES TAKE PRIORITY\n\nSheets1/2 place pins for readable wiring. Only this sheet specifies header viewing direction.\n\nSupplier photos verify LCD, touch and amp orders. C3 uses the manufacturer reference; confirm the received revision.\n\nAll unused MCU GPIOs remain unconnected. No signal connects to a battery rail.', 252, 9, 13)
    p.footer('Photo/source links are in WIRING.html and markdowns/companion_wiring.md. The C3 reference is not an A33-certified schematic.')


def terminal_sheet(c):
    p=Sheet(c, 4, 'AURA / CHARGING TERMINALS & USE', 'Terminal labels are verified from selected supplier photographs; actual board topology still needs continuity checks.')
    p.text(35, 494, 'TP4056 / COMPONENT FACE / USB LEFT', 10, bold=True)
    p.box(60, 324, 295, 146, 'MD0744', 'Input left / protected output + battery pads right', fill='#e7eff3')
    p.c.setStrokeColor(colors.HexColor(GREY))
    p.c.roundRect(42,372,36,37,3,fill=0,stroke=1)
    p.text(43,385,'USB-C',7)
    for y,label,net,colour in [(437,'+','IN+',RED),(343,'-','IN-',GREY)]:
        p.dot(62,y,colour)
        p.text(78,y-3, f'{label} = {net}', 9, colour, bold=True)
    for y,label in zip((422,397,372,347),DATA['header_reference']['CHARGER']['right_edge_top_to_bottom']):
        p.dot(355,y,INK)
        p.text(340,y-3,label,9,bold=True,align='right')
    p.para(35, 302, 'IN-/OUT- are expected to share protected ground. B- is the cell-only return through the protection stage. Do not bypass it with a ground jumper.', 335, 9, 13)
    p.text(421, 494, 'USB-C BREAKOUT / HW-139', 10, bold=True)
    p.para(421, 471, 'The photo shows twelve labelled pads. Follow their silk; names VCC1/2 and GND1/2 below identify the two occurrences, not factory numeric labels.', 386, 9, 13)
    rows=[('VCC + VCC','Join both to USB_CHARGE_5V'),('GND + GND','Join both to PGND'),('CC1','One5.1k resistor to PGND'),('CC2','A separate5.1k resistor to PGND'),('DP1 / DN1 / DP2 / DN2','Leave open'),('SBU1 / SBU2','Leave open')]
    y=413
    for i,(a,b) in enumerate(rows):
        p.c.setFillColor(colors.HexColor(LIGHT if i%2==0 else '#ffffff'))
        p.c.rect(421,y-9,385,25,fill=1,stroke=0)
        p.text(428,y,a,8.5,bold=True)
        p.text(568,y,b,8.5)
        y-=25
    p.text(421, 237, 'Do not short CC1 to CC2; do not double existing Rd.', 9, bold=True)
    p.text(35, 224, 'MT3608 / MATCH VIN & VOUT SILK', 10, bold=True)
    p.para(35, 205, 'VIN+ from charger OUT+; VIN-/VOUT- to PGND.\nVOUT+ through pole A to SYS_5V.\nVIN end has the inductor/IC; VOUT end has the blue trim pot. Set5.0V under a dummy load before attaching electronics.', 335, 9, 13)
    p.text(421, 208, 'DPDT / IDENTIFY LUGS BEFORE SOLDERING', 10, bold=True)
    p.para(421, 189, 'The six lugs are unnumbered. Find each common and its two throws with a continuity meter. Assign A_RUN and B_CHARGE by the mounted lever positions; insulate both unused throws. Do not infer contact direction from the lever.', 385, 9, 13)
    p.text(35, 114, 'TO CHARGE', 10, bold=True)
    p.para(35, 97, 'Select CHARGE; plug a regulated5V USB wall source rated1A or more into the external inlet. The normal load is off. Confirm the received board\'s charging/full indicators.', 335, 8.5, 12)
    p.text(421, 114, 'TO PROGRAM / FIRST POWER-UP', 10, bold=True)
    p.para(421, 97, 'Select CHARGE before plugging C3 USB into a PC. Unplug that cable before RUN. Keep TP4056 native USB unused. Verify polarity,5V/3V3 rails and charge current before closing the case.', 385, 8.5, 12)
    p.footer('This design supports charging in CHARGE mode. It does not supply normal operation while charging; physical charging tests remain.')


def find_pin_values():
    ini=(ROOT.parent/'platformio.ini').read_text('utf-8')
    c3=ini.split('[env:aura_esp32c3_phone]',1)[1]
    source=(ROOT.parent/'src/c3_main.cpp').read_text('utf-8')
    mapping={'S01':'TFT_SCLK','S02':'TFT_MOSI','S03':'TFT_CS','S04':'TFT_DC','S05':'TFT_RST',
             'S06':'PIN_TOUCH','S07':'PIN_I2S_BCLK','S08':'PIN_I2S_LRC','S09':'PIN_I2S_DIN'}
    checked={}
    for row in DATA['signals']:
        key=mapping[row['id']]
        match=re.search(r'-D'+key+r'=(\d+)',c3) if row['module']=='LCD' else re.search(r'\b'+key+r'\s*=\s*(\d+)',source)
        assert match and row['mcu']=='GPIO'+match.group(1), row
        checked[key]=int(match.group(1))
    assert 'I2S_CHANNEL_FMT_ONLY_LEFT' in source
    assert len(set(checked.values()))==9
    assert not set(checked.values()) & {2,8,9,18,19}
    return checked


def validate_netlist():
    pins={}
    for net, endpoints in DATA['nets'].items():
        for endpoint in endpoints:
            assert endpoint not in pins, (endpoint, net, pins.get(endpoint))
            pins[endpoint]=net
    assert pins['CELL.-']==pins['CHARGER.B-']=='CELL_NEG'
    assert pins['CELL.-']!=pins['USB.GND1']
    assert pins['AMP.SPK+']!=pins['AMP.SPK-']
    assert pins['AMP.SPK-']!=pins['AMP.GND']
    assert pins['C3.5V']==pins['AMP.Vin']=='SYS_5V'
    assert pins['LCD.VCC']==pins['TOUCH.VCC']==pins['AMP.SD']=='V3V3'
    assert pins['USB.CC1']!=pins['USB.CC2']
    assert 'SW.A_UNUSED' not in pins and 'SW.B_UNUSED' not in pins and 'AMP.GAIN' not in pins
    results={}
    for state, links in DATA['switch_states'].items():
        graph={}
        def add(a,b): graph.setdefault(a,set()).add(b);graph.setdefault(b,set()).add(a)
        for endpoints in DATA['nets'].values():
            for b in endpoints[1:]: add(endpoints[0],b)
        for a,b in links: add(a,b)
        def path(a,b):
            seen={a};todo=[a]
            while todo:
                item=todo.pop()
                if item==b:return True
                for nxt in graph.get(item,()):
                    if nxt not in seen:seen.add(nxt);todo.append(nxt)
            return False
        system_from_boost=path('BOOST.VOUT+','C3.5V')
        charger_from_usb=path('USB.VCC1','CHARGER.IN+')
        assert system_from_boost==(state=='RUN')
        assert charger_from_usb==(state=='CHARGE')
        assert not path('USB.VCC1','BOOST.VOUT+')
        assert not path('CELL.-','C3.GND')
        assert not path('C3.5V','C3.3V3')
        results[state]=dict(boost_to_system=system_from_boost,usb_to_charger=charger_from_usb,
                            usb_and_boost_positive_rails_joined=False,external_protection_bypass=False)
    return dict(result='PASS',firmware_pin_values=find_pin_values(),unique_signal_gpio_count=9,
                nets=len(DATA['nets']),switch_states=results,
                limits='Static wiring-intent audit only. Semiconductor paths, USB service-port backfeed, switch transitions, actual board topology and hardware operation require physical checks.')


def outputs(report):
    with (ROOT/'research/wiring_connections.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.writer(f)
        writer.writerow(['Net','From','To','Note'])
        for net,ends in DATA['nets'].items():
            for end in ends[1:]:
                writer.writerow([net,ends[0],end,DATA['rails'].get(net,'')])
        writer.writerow(['CONFIG','TP4056 IC pin2 PROG','3.0k resistor to IC pin3 GND','Replace existing resistor; verify actual footprint/pads'])
        for pin in DATA['open_terminals']:writer.writerow(['OPEN',pin,'NO CONNECTION','Insulate unused switch lugs; GAIN remains open for9dB'])
    source_links=[]
    for module,ref in DATA['header_reference'].items():
        source_links.append(f'<li><a href="{html.escape(ref["source"])}">{module}: {html.escape(ref["view"])}</a></li>')
    for key,url in DATA['sources'].items():
        if isinstance(url,str):source_links.append(f'<li><a href="{html.escape(url)}">{html.escape(key.replace("_"," "))}</a></li>')
    signal_rows=''.join(f'<tr><td>{r["mcu"]}</td><td>{r["module"]} {r["pin"]}</td><td>{r["role"]}</td></tr>' for r in DATA['signals'])
    checks=''.join(f'<li>{html.escape(c)}</li>' for c in DATA['bench_checks'])
    figures=''.join(f'<figure><a href="drawings/{i:02}_Wiring_{name}.png"><img src="drawings/{i:02}_Wiring_{name}.png" alt="{title}"></a><figcaption>{title}</figcaption></figure>' for i,name,title in [(9,'Signals','1. Signals and module power'),(10,'Charging','2. Battery and USB-C charging'),(11,'Headers','3. Physical header orientations'),(12,'Terminals','4. Charging terminals and operation')])
    page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aura R1 wiring</title><style>body{{margin:0;background:#f4f5f0;color:#254441;font:16px/1.55 system-ui,sans-serif}}main{{max-width:1200px;margin:auto;padding:40px 24px}}h1{{font-size:40px;margin-bottom:8px}}a{{color:#256657}}.note{{background:#fff5e5;border-left:4px solid #b58339;padding:16px 20px}}figure{{background:white;border:1px solid #d1dcd2;margin:24px 0}}img{{display:block;width:100%}}figcaption{{padding:12px 16px}}table{{border-collapse:collapse;width:100%}}td,th{{padding:10px;border-bottom:1px solid #ced8cf;text-align:left}}li{{margin-bottom:12px}}</style></head><body><main><p>AURA / W1 / 1 OCTOBER 2026</p><h1>Wire the companion.</h1><p>The diagrams match the existing C3 firmware and the photographed supplier module labels. Native microphone input comes from the Android phone.</p><p><a href="Aura_R1_Wiring_Diagram.pdf">Download the printable four-sheet PDF</a> · <a href="research/wiring_connections.csv">Every connection as a CSV</a> · <a href="../markdowns/companion_wiring.md">Detailed assembly instructions</a> · <a href="START_HERE.html">CAD overview</a></p><p class="note"><strong>Charging works in CHARGE mode.</strong> Select CHARGE and connect a regulated5V USB source to the external inlet. The DPDT opens the normal system supply while enabling the charger input. Select RUN after unplugging any C3 programming cable. The TP4056 native USB stays unused.</p>{figures}<h2>Firmware pin map</h2><table><thead><tr><th>C3 GPIO</th><th>Module terminal</th><th>Function</th></tr></thead><tbody>{signal_rows}</tbody></table><p>SYS_5V powers C3 5V and amp Vin. C3 3V3 powers LCD VCC, touch VCC and amp SD. All module grounds join PGND. Only cell negative connects to B-. Speaker wires go exclusively to amplifier SPK+ and SPK-.</p><h2>Before power and final assembly</h2><ol>{checks}</ol><p>Do not infer switch lug numbers from the drawing. Its supplier provides six unnumbered terminals; identify the commons and throws by continuity. The C3 physical layout is a Nologo reference consistent with visible A33 markings; confirm the received revision.</p><h2>Evidence</h2><ul>{''.join(source_links)}</ul><p>Static check: firmware GPIOs agree; no assigned-pin overlap; RUN/CHARGE net isolation passes. This does not certify semiconductor behavior or replace physical charge, protection and temperature tests. One mechanical discrepancy: the MD0744 listing text says26×17mm while its dimensioned photograph says28×17mm; measure before final enclosure printing.</p></main></body></html>'''
    (ROOT/'WIRING.html').write_text(page,'utf-8')
    (ROOT/'research/wiring_validation.json').write_text(json.dumps(report,indent=2),'utf-8')


def main():
    report=validate_netlist()
    pdf=ROOT/'Aura_R1_Wiring_Diagram.pdf'
    c=canvas.Canvas(str(pdf),pagesize=(WIDTH,HEIGHT),pageCompression=1)
    c.setTitle('Aura R1 - Pin-by-pin wiring and rechargeable battery')
    c.setAuthor('Project Aura')
    for fn in (signal_sheet,power_sheet,physical_sheet,terminal_sheet):fn(c)
    c.save()
    reader=PdfReader(pdf)
    assert len(reader.pages)==4
    extracted='\n'.join(page.extract_text() for page in reader.pages)
    for required in ('GPIO4','GPIO6','GPIO7','GPIO5','GPIO3','GPIO20','GPIO0','GPIO1','GPIO10','CC1','CC2','B_COMMON','A_COMMON','CHARGE','PGND'):
        assert required in extracted, required
    doc=fitz.open(pdf)
    labels=[(9,'Signals'),(10,'Charging'),(11,'Headers'),(12,'Terminals')]
    for page,(number,name) in zip(doc,labels):
        path=ROOT/'drawings'/f'{number:02}_Wiring_{name}'
        page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(str(path)+'.png')
        (path.with_suffix('.svg')).write_text(page.get_svg_image(text_as_path=False),'utf-8')
    doc.close()
    report['pdf_pages']=4
    report['rendered_from_final_pdf']=True
    outputs(report)
    print('PASS: firmware map,22-net connectivity,charge/run switch isolation,4-page PDF/text/render checks.')
    print(pdf)


if __name__=='__main__':main()
