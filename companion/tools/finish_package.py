"""Create the drawing set, supplier/measurement tables and review/print packages."""
import csv
import html
import json
from pathlib import Path
import shutil
import zipfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch, Rectangle

ROOT = Path(__file__).resolve().parents[1]
INK, GREEN, PALE, GOLD = '#254441', '#608479', '#edf3ed', '#b58339'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                     'text.color': INK, 'axes.labelcolor': INK, 'svg.fonttype': 'none'})


def csv_file(name, columns, rows):
    with (ROOT / 'research' / name).open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(rows)


def dim(ax, a, b, label, offset=0, vertical=False):
    if vertical:
        x = a[0] + offset
        for p in (a, b): ax.plot([p[0], x], [p[1], p[1]], color=GREEN, lw=.6)
        ax.annotate('', (x, a[1]), (x, b[1]), arrowprops=dict(arrowstyle='<->', color=INK, lw=.8))
        ax.text(x-2, (a[1]+b[1])/2, label, rotation=90, ha='right', va='center', fontsize=9)
    else:
        y = a[1] + offset
        for p in (a, b): ax.plot([p[0], p[0]], [p[1], y], color=GREEN, lw=.6)
        ax.annotate('', (a[0], y), (b[0], y), arrowprops=dict(arrowstyle='<->', color=INK, lw=.8))
        ax.text((a[0]+b[0])/2, y+2, label, ha='center', va='bottom', fontsize=9)


def panel(ax, title, xlim, ylim):
    ax.set_title(title, loc='left', fontsize=13, fontweight='bold', pad=12)
    ax.set_aspect('equal')
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.axis('off')


def save(fig, name):
    fig.savefig(ROOT / 'drawings' / (name + '.svg'), facecolor='white', bbox_inches='tight')
    fig.savefig(ROOT / 'drawings' / (name + '.png'), dpi=180, facecolor='white', bbox_inches='tight')
    plt.close(fig)


def ga_drawing(report):
    fig, axs = plt.subplots(2, 2, figsize=(15.5, 11.2))
    fig.subplots_adjust(top=.89, bottom=.08, hspace=.34, wspace=.22)
    fig.suptitle('AURA R1  /  GENERAL ARRANGEMENT', x=.10, ha='left', fontsize=22, fontweight='bold')
    fig.text(.10, .925, 'Dimensions in mm | schematic orthographic views | STEP geometry governs | engineering prototype', fontsize=10)
    ax = axs[0, 0]
    panel(ax, '01  FRONT  (-Y)', (-66, 59), (-14, 88))
    ax.add_patch(FancyBboxPatch((-45, 0), 90, 74, boxstyle='round,pad=0,rounding_size=5', fc=PALE, ec=INK, lw=1.2))
    ax.plot([-45, 45], [24.175, 24.175], color=GREEN, lw=.8)
    ax.add_patch(Circle((0, 46.5), 22, fill=False, ec=INK, lw=1.2))
    ax.add_patch(Circle((0, 46.5), 16.7, fc=INK))
    for x in (-6, 6): ax.add_patch(Circle((x, 47.5), 2.7, fc='#b2e5d5'))
    ax.plot([0, 0], [19, 74], ':', color=GREEN, lw=.6)
    dim(ax, (-45, 74), (45, 74), '90.00 shell width', 9)
    dim(ax, (-45, 0), (-45, 74), '74.00 shell height', -12, True)
    ax.annotate('Bezel OD 44 / aperture 33.4', xy=(16, 61), xytext=(18, 70), fontsize=8,
                arrowprops=dict(arrowstyle='-', color=GREEN))
    ax.text(0, 7, 'Split at Z 24.00 / 24.35', ha='center', fontsize=9)
    ax.text(0, -9, 'LCD centre: X 0, Z 46.50', ha='center', fontsize=9)
    ax = axs[0, 1]
    panel(ax, '02  REAR  (+Y)', (-62, 62), (-13, 88))
    ax.add_patch(FancyBboxPatch((-45, 0), 90, 74, boxstyle='round,pad=0,rounding_size=5', fc=PALE, ec=INK, lw=1.2))
    ax.plot([-45, 45], [24.175, 24.175], color=GREEN, lw=.8)
    # Rear view reverses the X direction.
    ax.add_patch(FancyBboxPatch((16, 35.35), 16, 9, boxstyle='round,pad=0,rounding_size=2.3', fc='white', ec=INK))
    ax.add_patch(Rectangle((-37, 30.1), 22, 20.4, fill=False, ec=GREEN))
    ax.add_patch(Circle((-26, 39), 3.3, fill=False, ec=INK))
    for x in range(-12, 13, 4): ax.plot([x, x], [51, 61], color=GREEN, lw=2)
    for x in (-28, 28):
        for z in (63.5, 67): ax.add_patch(Rectangle((x-3.8, z-.7), 7.6, 1.4, fc=GREEN))
    ax.annotate('USB inlet: 16 x 9 opening\nX -24 / Z 39.85', (24, 40), (11, 81), fontsize=9,
                arrowprops=dict(arrowstyle='-', color=GREEN))
    ax.annotate('Toggle: trial bore 6.6\nX +26 / Z 39.00', (-26, 39), (-54, 81), fontsize=9,
                arrowprops=dict(arrowstyle='-', color=GREEN))
    ax.text(0, 13, 'Speaker centre X 0 / Z 56\nFour high rear vents: 7.6 x 1.4', ha='center', fontsize=9)
    ax.text(0, -9, 'Rear-view +X is to the left', ha='center', fontsize=9)
    ax = axs[1, 0]
    panel(ax, '03  PLAN  (+Z)', (-66, 59), (-56, 51))
    ax.add_patch(FancyBboxPatch((-45, -39), 90, 78, boxstyle='round,pad=0,rounding_size=16', fc=PALE, ec=INK, lw=1.2))
    ax.add_patch(FancyBboxPatch((-42.6, -36.6), 85.2, 73.2, boxstyle='round,pad=0,rounding_size=13.6', fill=False, ec=GREEN, ls='--', lw=.7))
    footprints = [(-38.5, 10.5, 77, 21, '18650 + holder'), (-28.5, -32, 17, 26, 'CHG'),
                  (10.5, -32, 17, 36, 'BOOST'), (-34, -11.25, 18, 22.5, 'C3'),
                  (13, -13.5, 18, 19, 'AMP')]
    for x, y, w, h, label in footprints:
        ax.add_patch(Rectangle((x, y), w, h, fill=False, ec=GREEN, lw=.8))
        ax.text(x+w/2, y+h/2, label, ha='center', va='center', fontsize=7)
    dim(ax, (-45, -39), (-45, 39), '78.00 shell depth', -12, True)
    ax.text(0, -48, 'FRONT  -Y    |    X right / Z up', ha='center', fontsize=9)
    ax.text(0, 44, 'R16 plan corners / wall 2.4', ha='center', fontsize=9)
    ax = axs[1, 1]
    ax.axis('off')
    size = report['complete_size_mm']
    ax.set_title('04  CONTROLLED DIMENSIONS / NOTES', loc='left', fontweight='bold', fontsize=13, pad=12)
    notes = [
        'Shell: 90.00 W x 78.00 D x 74.00 H',
        f'Complete CAD envelope: {size[0]:.2f} x {size[1]:.2f} x {size[2]:.2f}',
        'Complete size includes bezel, toggle and rubber feet.',
        '', 'Wall 2.4 / base floor 2.8 / touch roof skin 1.4',
        'Top edge blend R8 / bottom edge blend R3',
        'Four side latches at X +/-41.35, Y +/-20',
        '18 x M3 inserts: OD5 x length4; trial pilot 4.4',
        '16 x M3x6 screws + 2 x M3x8 (USB carrier)',
        '', 'Printed parts: 13 separate solids + 4 fit coupons',
        'Purchased modules: simplified fit envelopes only.',
        'Unverified dimensions: see measurement_checklist.csv.',
        'No general manufacturing tolerance is assigned.',
        'Confirm received parts and printer fit before release.'
    ]
    ax.text(0, .96, '\n'.join(notes), transform=ax.transAxes, va='top', fontsize=10, linespacing=1.65)
    fig.text(.10, .028, 'AURA / R1 / GA-01     2026-10-01     Not to scale on screen. Do not infer dimensions from the image.', fontsize=9)
    save(fig, '06_General_arrangement')


def details_drawing():
    fig, axs = plt.subplots(1, 3, figsize=(16, 7.3))
    fig.subplots_adjust(top=.79, bottom=.19, wspace=.32)
    fig.suptitle('AURA R1  /  INSERTS, LATCHES & FIT', x=.075, ha='left', fontsize=22, fontweight='bold')
    fig.text(.075, .875, 'Detail dimensions in mm | these are starting prototype fits, subject to coupon verification', fontsize=10)
    ax = axs[0]
    panel(ax, 'A  INSERT SECTION', (-8, 9), (-3, 11))
    ax.add_patch(Rectangle((-4, 0), 8, 6, fc=PALE, ec=INK))
    ax.add_patch(Rectangle((-2.2, 1), 4.4, 5, fc='white', ec=GREEN, ls='--'))
    for x in (-2.5, 1.55): ax.add_patch(Rectangle((x, 2), .95, 4, fc=GOLD, alpha=.85, ec=INK, lw=.5))
    dim(ax, (-2.5, 6), (2.5, 6), 'Insert OD 5', 2)
    dim(ax, (4, 2), (4, 6), '4 long', 2, True)
    ax.text(0, -1.5, 'M3 thread / trial pilot 4.4\nHeat-set interference is intentional', ha='center', va='top', fontsize=9)
    ax = axs[1]
    panel(ax, 'B  LATCH SECTION', (-8, 7), (15, 45))
    # X relative to the beam centre; Z matches the real assembled latch.
    ax.add_patch(Rectangle((-.6, 21), 1.2, 18, fc=GREEN, ec=INK))
    ax.fill([-.6, 1.6, 1.6, .6, -.6], [37.5, 37.5, 38.2, 40, 40], color=GREEN, ec=INK)
    ax.add_patch(Rectangle((-1.45, 18), 3, 3, fc=GREEN, ec=INK))
    ax.add_patch(Rectangle((1.25, 24.35), 2.4, 12.8, fc=PALE, ec=INK))
    ax.add_patch(Rectangle((2.75, 37.15), .9, 3.2, fc=PALE, ec=INK))
    dim(ax, (-.6, 21), (-.6, 37.5), '16.5 nominal free length', -4, True)
    ax.text(-6, 42, 'Root R0.4 / width 6\nBeam thickness 1.2', fontsize=9)
    ax.annotate('0.35 catch', (1.35, 37.5), (2, 34.5), fontsize=9, arrowprops=dict(arrowstyle='-', color=INK))
    ax.text(-6, 16, 'Insertion bends inward (left)\nFour release windows: 5.6 x 1.8', fontsize=9)
    ax = axs[2]
    ax.axis('off')
    ax.set_title('C  COUPONS / ACCEPTANCE', loc='left', fontweight='bold', fontsize=13, pad=12)
    ax.text(0, .97, '\n'.join([
        'C01: insert trials 4.3 / 4.4 / 4.5 / 4.6',
        'Left to right along +X; raised labels omitted.',
        'C02 + C03: latch and mating receiver',
        'C04: 16 x 9 USB cable opening', '',
        'Tongue radial clearance: 0.35',
        'Shell seam gap: 0.35',
        'Foam: 0.5 nominal, compressed to 0.35', '',
        'Estimated snap strain: 0.486%',
        '(0.7 deflection / 16.1 effective length)',
        'Elastic beam estimate only; test PETG.', '',
        'Check insertion and repeated release,',
        'root cracks, layer adhesion and rattle.',
        'Verify tool access before final assembly.'
    ]), transform=ax.transAxes, va='top', fontsize=10, linespacing=1.65)
    fig.text(.075, .055, 'AURA / R1 / DT-01     STEP geometry governs. Install inserts before electronics. No fatigue life or printer tolerance is certified.', fontsize=10)
    save(fig, '07_Snap_and_insert_details')


def wiring_drawing():
    fig, ax = plt.subplots(figsize=(15, 9))
    fig.subplots_adjust(top=.86, bottom=.10, left=.06, right=.96)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9)
    ax.axis('off')
    fig.suptitle('AURA R1  /  BATTERY & CHARGING', x=.065, ha='left', fontsize=22, fontweight='bold')
    fig.text(.065, .905, 'Connection diagram | one cell | 5 V USB charging | settled RUN / CHARGE states', fontsize=11)
    def block(x, y, w, h, text):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=.12,rounding_size=.12', fc=PALE, ec=GREEN))
        ax.text(x+w/2, y+h/2, text, va='center', ha='center', fontsize=10, linespacing=1.4)
    def arrow(a, b, text='', xy=None):
        ax.annotate('', b, a, arrowprops=dict(arrowstyle='->', color=INK, lw=1.5))
        if text: ax.text(*(xy or ((a[0]+b[0])/2, (a[1]+b[1])/2+.2)), text, ha='center', fontsize=9)
    block(.2, 6.3, 2.2, 1.4, 'USB-C inlet\n5 V only\nCC1 / CC2: separate Rd')
    block(3.3, 6.3, 2.5, 1.4, 'DPDT pole B\nCHARGE: VBUS to IN+\nRUN: open')
    block(6.8, 6.1, 2.7, 1.8, 'Protected TP4056\nRPROG ~3.0k\nTarget 367-400 mA\nVerify actual topology')
    block(6.8, 3.1, 2.7, 1.2, 'One 18650 cell\nB+ / B- only')
    block(10.7, 6.1, 3.6, 1.8, 'MT3608 boost\nIN from protected OUT\nAdjust to 5.0 V first\nRemains powered in CHARGE')
    block(10.7, 3.1, 3.6, 1.2, 'DPDT pole A\nRUN: boost OUT+ to SYS5V\nCHARGE: open')
    block(10.7, .6, 3.6, 1.1, 'Switched SYS5V\nESP32-C3 + amplifier\nLCD / touch via C3 3V3')
    arrow((2.55, 7), (3.15, 7), 'VBUS', (2.85, 7.3))
    arrow((5.95, 7), (6.65, 7), 'IN+', (6.3, 7.3))
    arrow((9.65, 7), (10.55, 7), 'OUT +/-', (10.1, 7.35))
    arrow((8.15, 4.45), (8.15, 5.95), 'B +/-', (8.75, 5.05))
    arrow((12.5, 5.95), (12.5, 4.45), '5 V', (13, 5.1))
    arrow((12.5, 2.95), (12.5, 1.85), 'SYS5V', (13.2, 2.35))
    ax.plot([4.55, 4.55, 10.35, 10.35, 10.55], [6.15, 4.8, 4.8, 3.7, 3.7], '--', color=GOLD, lw=1.2)
    ax.text(.2, 4.8, 'One mechanically\nlinked DPDT switch', fontsize=10)
    ax.text(.2, 2.85, '\n'.join([
        'COMMON RETURN: USB GND + system GND + boost GND -> OUT-/IN-.',
        'Only cell negative connects to B-. Do not bypass the protection FETs.',
        'Unused throws remain open and insulated. Identify pins by continuity.',
        '5.1k from each CC pin to GND only if not already fitted on the inlet.', '',
        'Internal C3 programming USB: set CHARGE before connection;',
        'unplug it before RUN to avoid paralleling PC VBUS and boosted 5 V.',
        'Verify idle drain, charge termination, contact rating and temperatures.'
    ]), va='top', fontsize=9.5, linespacing=1.7)
    fig.text(.065, .037, 'AURA / R1 / EL-01     Not charge-and-play. Switch transition timing and received module topology require bench verification.', fontsize=10)
    save(fig, '08_Power_connections')


def tables(bom, manifest):
    csv_file('supplier_bom.csv', ['ID', 'Item', 'Supplier_SKU', 'Qty', 'Unit_LKR', 'Stock_checked_2026-10-01', 'Source', 'Dimension_status', 'Model_dimensions'],
             [[r['id'], r['item'], r['sku'], r['qty'], r['unit_lkr'], r['stock'], r['url'], r['confidence'], r['model_dimensions']] for r in bom['components']])
    csv_file('measurement_checklist.csv', ['ID', 'Item', 'Published_dimensions_mm', 'Provisional_or_model_dimensions_mm', 'Required_check', 'Measured_value_mm', 'Accepted_date', 'Notes'],
             [[r['id'], r['item'], r['published_dimensions'], r['model_dimensions'], r['verify'], '', '', ''] for r in bom['components']])
    inserts = []
    host_map = {pair[0]: pair[1] for pair in manifest['intentional_interference']}
    for r in manifest['parts']:
        if '_insert_' not in r['id']: continue
        b = r['bounds_mm']
        c = [(b[i]+b[i+3])/2 for i in range(3)]
        axis = 'Y' if r['id'].startswith(('H50', 'H70')) else 'Z'
        # Direction in which the installation tool pushes the insert into its boss.
        direction = '+Y' if r['id'].startswith('H70') else ('-Y' if axis == 'Y' else ('+Z' if r['id'].startswith('H90') else '-Z'))
        inserts.append([r['id'], host_map[r['id']], *[round(v, 3) for v in c], axis, direction,
                        5, 4, 4.4, *b])
    assert len(inserts) == 18
    csv_file('insert_locations.csv', ['Insert', 'Host_part', 'Centre_X_mm', 'Centre_Y_mm', 'Centre_Z_mm', 'Axis', 'Installation_push_direction', 'OD_mm', 'Length_mm', 'Trial_pilot_mm', 'Xmin', 'Ymin', 'Zmin', 'Xmax', 'Ymax', 'Zmax'], inserts)


def landing_page(bom, report):
    esc = html.escape
    priced = sum(r['qty']*r['unit_lkr'] for r in bom['components'] if r['unit_lkr'] is not None)
    rows = '\n'.join(f'<tr><td>{esc(r["item"])}</td><td><a href="{esc(r["url"])}">{esc(r["sku"])}</a></td><td>{r["qty"]}</td><td>{esc(r["model_dimensions"])}</td><td>{esc(r["confidence"])}</td></tr>' for r in bom['components'])
    local_links = [('Aura_R1_Main_Assembly.step', 'Main assembly · STEP'), ('exports/Aura_R1_Exploded.step', 'Exploded review · STEP'),
                   ('WIRING.html', 'Full wiring and charging instructions'), ('Aura_R1_Wiring_Diagram.pdf', 'Pin-by-pin wiring · four-sheet PDF'),
                   ('exports/Aura_R1_Main_Assembly.glb', '3D preview · GLB'), ('exports/Aura_R1_Print_Pack.zip', 'Print pack · 13 parts + 4 coupons'),
                   ('STL/', 'STL folder · only the 13 parts to print'), ('parts/printed/', 'Individual printable STEP parts'), ('parts/electronics/', 'Purchased-module envelopes'),
                   ('parts/hardware/', 'Inserts, screws and pads'), ('../markdowns/companion_mechanical_design.md', 'Detailed design and assembly guide'),
                   ('research/supplier_bom.csv', 'Supplier BOM'), ('research/measurement_checklist.csv', 'Measurement checklist'),
                   ('research/insert_locations.csv', '18 insert positions'), ('research/part_dimensions.csv', 'All part dimensions'),
                   ('HEATSINKS_AND_COOLING.txt', 'Heatsink and ventilation guidance'),
                   ('research/export_validation.json', 'STEP and mesh validation'), ('research/validation.json', 'Interference report'),
                   ('tools/build_companion.py', 'Parametric CAD source'), ('tools/rebuild.ps1', 'Rebuild script')]
    links = ''.join(f'<li><a href="{url}">{label}</a></li>' for url, label in local_links)
    gallery = ''.join(f'<figure><a href="drawings/{name}.png"><img src="drawings/{name}.png" alt="{esc(label)}"></a><figcaption>{esc(label)}</figcaption></figure>' for name, label in [
        ('01_Assembled', 'Assembled desk companion'), ('02_Rear_ports', 'Rear charging, switch and speaker'),
        ('03_Internal_layout', 'Internal component arrangement'), ('04_Exploded', 'Separate printed parts'),
        ('05_Cutaway', 'Section through the model'), ('06_General_arrangement', 'Dimensions and datums'),
        ('07_Snap_and_insert_details', 'Latch and insert details'), ('08_Power_connections', 'Battery and charging connections')])
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aura R1 · CAD review</title>
<style>body{{margin:0;background:#f4f5f0;color:#24413d;font:16px/1.55 system-ui,sans-serif}}main{{max-width:1200px;margin:auto;padding:48px 24px}}h1{{font-size:48px;line-height:1.05;margin:12px 0}}h2{{margin-top:44px}}a{{color:#256657}}.eyebrow{{letter-spacing:.15em;text-transform:uppercase;font-size:12px}}.lead{{font-size:22px;max-width:820px}}.note{{padding:18px 22px;border-left:4px solid #b78944;background:#fff8e9}}.files{{columns:2;padding-left:22px}}.files li{{margin:9px 0;break-inside:avoid}}.gallery{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}}figure{{margin:0;background:white;border:1px solid #d7e0d6}}img{{width:100%;display:block}}figcaption{{padding:12px 16px}}table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{padding:12px 9px;border-bottom:1px solid #d0dad0;text-align:left;vertical-align:top}}th{{background:#e1ebe2}}.tablewrap{{overflow:auto}}footer{{margin-top:40px;border-top:1px solid #c7d4c8;padding-top:18px;font-size:13px}}@media(max-width:700px){{.gallery{{grid-template-columns:1fr}}.files{{columns:1}}h1{{font-size:36px}}}}</style></head><body><main>
<div class="eyebrow">Aura / Revision 1 / 01 October 2026</div><h1>A small companion.<br>A complete CAD prototype.</h1>
<p class="lead">90 × 78 × 74 mm shell, rechargeable 18650 power, round display, touch input and speaker. Four latches close the base; internal inserts secure the removable carriers.</p>
<p class="note"><strong>Engineering prototype — measurements required.</strong> Local generic modules do not all have complete mechanical drawings. Every provisional envelope is identified in the BOM. Confirm the received parts and print the fit coupons before the full enclosure. Physical charging, thermal, radio and latch tests remain to be done.</p>
<h2>Open the assembly</h2><p>The main STEP contains named groups for 13 printed parts, purchased modules, hardware and display pixels. Open it in SolidWorks retaining its assembly structure. Individual parts are in <code>parts/</code>. The Python source retains the construction parameters; STEP imports do not provide native SolidWorks feature history.</p>
<ul class="files">{links}</ul>
<h2>Review the actual geometry</h2><div class="gallery">{gallery}</div>
<h2>Selected Sri Lankan components</h2><p>Tronic is preferred, with Alphatronic and Duino used for locally available alternatives. Supplier stock was checked on 1 October 2026. The priced subset totals LKR {priced:,.0f}; screws, resistor packs, consumables, printing and delivery are additional. Confirm stock and current prices before purchase.</p>
<div class="tablewrap"><table><thead><tr><th>Part</th><th>Supplier / SKU</th><th>Qty</th><th>CAD dimensions (mm)</th><th>Evidence</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>What was checked</h2><p>{report['assembly_solids']} valid solids re-imported from the main STEP; all 13 printed STEP parts re-imported as single solids. The 13 print meshes and four coupons are closed, manifold, connected and positioned at bed Z=0. The static interference check found zero unexpected intersections above 0.025 mm³. Intended insert-to-plastic interference is listed separately.</p>
<p>The complete model envelope including protrusions and feet is {' × '.join(f'{v:.2f}' for v in report['complete_size_mm'])} mm. Switch RUN powers the companion; CHARGE isolates its normal load. This revision does not operate while charging.</p>
<h2>Heatsinks and ventilation</h2><p>No additional heatsink is selected or fit-qualified. The TP4056 charger and MT3608 boost converter need the closest temperature checks. The case includes low front intake and high rear exhaust slots. See <a href="HEATSINKS_AND_COOLING.txt">the cooling note</a> for component-specific guidance and manufacturer sources. Heat-set inserts are separate hardware: 18 M3 × 4 × 5 brass inserts are required.</p>
<footer>Automatic approval review blocked access to the running SolidWorks session. Native SolidWorks import and visual checking were therefore not performed. Delivery uses a named STEP assembly, separate solids and actual BREP renders. The existing companion.SLDPRT remains untouched.</footer>
</main></body></html>'''
    (ROOT / 'START_HERE.html').write_text(page, 'utf-8')


def packages():
    notice = '''AURA R1 ENGINEERING PROTOTYPE — units mm
13 printable parts and 4 coupons. Open START_HERE.html in the full CAD folder.
Read markdowns/companion_mechanical_design.md in the project before assembly.
Supplier envelopes remain provisional; verify the received modules first.
Use PETG as a starting material. Print fit coupons before the enclosure.
STLs are bed-positioned; inspect support requirements in the slicer.
No physical fit, charging, temperature or latch-cycle test is claimed.
'''
    (ROOT / 'exports/PRINT_FIRST.txt').write_text(notice, 'utf-8')
    stl_folder = ROOT / 'STL'
    stl_folder.mkdir(exist_ok=True)
    print_files = sorted((ROOT / 'parts/printed').glob('*.stl'))
    assert len(print_files) == 13
    for p in print_files:
        destination = stl_folder / p.name
        shutil.copyfile(p, destination)
        assert destination.read_bytes() == p.read_bytes()
    assert {p.name for p in stl_folder.iterdir()} == {p.name for p in print_files}, 'STL folder contains unexpected files; inspect without deleting user data.'
    with zipfile.ZipFile(ROOT / 'exports/Aura_R1_Print_Pack.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for folder in ('printed', 'coupons'):
            for p in sorted((ROOT / 'parts' / folder).glob('*.stl')): z.write(p, f'{folder}/{p.name}')
        z.writestr('READ_BEFORE_PRINTING.txt', notice)
        for name in ('06_General_arrangement.svg', '07_Snap_and_insert_details.svg'):
            z.write(ROOT / 'drawings' / name, f'drawings/{name}')
        z.write(ROOT / 'research/measurement_checklist.csv', 'measurement_checklist.csv')
        z.write(ROOT / 'HEATSINKS_AND_COOLING.txt', 'HEATSINKS_AND_COOLING.txt')
    # Full engineering package preserves the project-relative link to markdowns.
    with zipfile.ZipFile(ROOT / 'exports/Aura_R1_CAD_Package.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for p in sorted(ROOT.rglob('*')):
            if not p.is_file(): continue
            relative = p.relative_to(ROOT)
            if any(a in ('_build', '__pycache__') for a in relative.parts): continue
            if p.suffix.lower() in ('.pyc', '.sldprt') or p.name.startswith('~$'): continue
            if p.suffix.lower() == '.zip' and p.name != 'Aura_R1_Print_Pack.zip': continue
            z.write(p, 'companion/' + relative.as_posix())
        for filename in ('companion_mechanical_design.md', 'companion_wiring.md'):
            guide = ROOT.parent / 'markdowns' / filename
            z.write(guide, 'markdowns/' + guide.name)
    for name in ('Aura_R1_Print_Pack.zip', 'Aura_R1_CAD_Package.zip'):
        with zipfile.ZipFile(ROOT / 'exports' / name) as z:
            assert z.testzip() is None, name
            print(name, len(z.namelist()), 'files;', (ROOT / 'exports' / name).stat().st_size, 'bytes')


if __name__ == '__main__':
    bom = json.loads((ROOT / 'research/components.json').read_text('utf-8'))
    manifest = json.loads((ROOT / 'research/assembly_manifest.json').read_text('utf-8'))
    report = json.loads((ROOT / 'research/export_validation.json').read_text('utf-8'))
    assert report['result'] == 'PASS'
    tables(bom, manifest)
    ga_drawing(report)
    details_drawing()
    wiring_drawing()
    landing_page(bom, report)
    packages()
    print('Review page, dimension drawings, supplier tables and ZIP packages written.')
