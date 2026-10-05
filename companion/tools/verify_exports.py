"""Check the actual exported assembly, printable solids and manifold meshes."""
import json
from pathlib import Path
import cadquery as cq
import vtk

ROOT = Path(__file__).resolve().parents[1]


def check_mesh(path):
    reader = vtk.vtkSTLReader()
    reader.SetFileName(str(path))
    reader.MergingOn()
    reader.Update()
    clean = vtk.vtkCleanPolyData()
    clean.SetInputConnection(reader.GetOutputPort())
    clean.Update()
    mesh = clean.GetOutput()
    edges = vtk.vtkFeatureEdges()
    edges.SetInputData(mesh)
    edges.BoundaryEdgesOn()
    edges.NonManifoldEdgesOn()
    edges.FeatureEdgesOff()
    edges.ManifoldEdgesOff()
    edges.Update()
    regions = vtk.vtkPolyDataConnectivityFilter()
    regions.SetInputData(mesh)
    regions.SetExtractionModeToAllRegions()
    regions.Update()
    bounds = mesh.GetBounds()
    row = dict(file=str(path.relative_to(ROOT)).replace('\\', '/'),
               triangles=mesh.GetNumberOfCells(),
               boundary_or_nonmanifold_edges=edges.GetOutput().GetNumberOfCells(),
               connected_regions=regions.GetNumberOfExtractedRegions(),
               minimum_z_mm=round(bounds[4], 6))
    assert row['triangles'] > 0, row
    assert row['boundary_or_nonmanifold_edges'] == 0, row
    assert row['connected_regions'] == 1, row
    assert abs(row['minimum_z_mm']) < .001, row
    return row


def main():
    manifest = json.loads((ROOT / 'research/assembly_manifest.json').read_text('utf-8'))
    geometry = json.loads((ROOT / 'research/validation.json').read_text('utf-8'))
    assert geometry['all_parts_valid'] and geometry['printable_parts_single_solid']
    assert not geometry['unexpected_interferences'], geometry['unexpected_interferences']
    path = ROOT / 'Aura_R1_Main_Assembly.step'
    text = path.read_text('utf-8')
    groups = ['AURA_R1_MAIN_ASSEMBLY', '01_Printable_parts', '02_Purchased_modules',
              '03_Inserts_fasteners_pads', '04_Display_state_visual_only']
    for name in groups + [p['id'] for p in manifest['parts']]:
        assert name in text, f'Missing STEP name: {name}'
    assembly = cq.importers.importStep(str(path)).val()
    expected = sum(p['solid_count'] for p in manifest['parts'])
    assert assembly.isValid()
    assert len(assembly.Solids()) == expected, (len(assembly.Solids()), expected)
    expected_volume = sum(p['volume_mm3'] for p in manifest['parts'])
    assert abs(assembly.Volume() - expected_volume) < .2
    bb = assembly.BoundingBox()
    actual_bounds = [bb.xmin, bb.ymin, bb.zmin, bb.xmax, bb.ymax, bb.zmax]
    manifest_bounds = [min(p['bounds_mm'][i] for p in manifest['parts']) for i in range(3)]
    manifest_bounds += [max(p['bounds_mm'][i] for p in manifest['parts']) for i in range(3, 6)]
    assert max(abs(a-b) for a, b in zip(actual_bounds, manifest_bounds)) < .01
    print_checks = []
    for row in manifest['parts']:
        if row['category'] != 'printed':
            continue
        part = cq.importers.importStep(str(ROOT / row['file'])).val()
        assert part.isValid() and len(part.Solids()) == 1, row['id']
        assert abs(part.Volume() - row['volume_mm3']) < .02, row['id']
        mesh = check_mesh((ROOT / row['file']).with_suffix('.stl'))
        print_checks.append(dict(id=row['id'], step_valid=True, single_solid=True, mesh=mesh))
    assert len(print_checks) == 13
    coupons = [check_mesh(p) for p in sorted((ROOT / 'parts/coupons').glob('*.stl'))]
    assert len(coupons) == 4
    report = dict(result='PASS', named_step_groups=groups, assembly_step_valid=True,
                  assembly_solids=expected, assembly_bounds_mm=[round(v, 4) for v in actual_bounds],
                  complete_size_mm=[round(actual_bounds[i+3]-actual_bounds[i], 4) for i in range(3)],
                  unexpected_interferences=0, intersection_reporting_threshold_mm3=.025,
                  printed_parts=print_checks, coupons=coupons,
                  limits='Static model/import/mesh checks only. Supplier envelopes remain provisional; no physical fit, electrical, thermal, radio or fatigue validation.')
    (ROOT / 'research/export_validation.json').write_text(json.dumps(report, indent=2), 'utf-8')
    print('PASS:', expected, 'assembly solids; 13 individual STEP solids; 17 closed manifold, single-region, bed-positioned STL meshes.')
    print('Complete bounds including protrusions/feet:', report['complete_size_mm'], 'mm')


if __name__ == '__main__':
    main()
