"""Render the actual BREP meshes withVTK; no generative product images."""
import contextlib
import io
import json
from pathlib import Path
import numpy as np
import vtk
from PIL import Image, ImageDraw, ImageFont
import build_companion as model

ROOT=model.ROOT

def actor(shape,color,shift=(0,0,0),opacity=1):
    vertices,triangles=shape.tessellate(.085,.16)
    pts=vtk.vtkPoints()
    for v in vertices: pts.InsertNextPoint(v.x,v.y,v.z)
    cells=vtk.vtkCellArray()
    for t in triangles:
        cells.InsertNextCell(3)
        for i in t: cells.InsertCellPoint(i)
    data=vtk.vtkPolyData();data.SetPoints(pts);data.SetPolys(cells)
    normals=vtk.vtkPolyDataNormals();normals.SetInputData(data);normals.SetFeatureAngle(55);normals.SplittingOn();normals.ConsistencyOn();normals.Update()
    mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(normals.GetOutputPort())
    a=vtk.vtkActor();a.SetMapper(mapper);a.SetPosition(*shift)
    rgb=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
    p=a.GetProperty();p.SetColor(*rgb);p.SetOpacity(opacity);p.SetAmbient(.25);p.SetDiffuse(.72);p.SetSpecular(.18);p.SetSpecularPower(35)
    return a

def render(filename,title,subtitle,mode='assembled',camera=(-135,-180,115)):
    ren=vtk.vtkRenderer();ren.SetBackground(.954,.958,.951)
    for key,p in model.PARTS.items():
        shift=(0,0,0);alpha=1
        if mode=='internal':
            if key in ('P01_Upper_shell','P03_Face_bezel','H01_Bezel_adhesive'):continue
            if key=='P02_Snap_base':alpha=.20
        if mode=='exploded':
            if key=='P01_Upper_shell':shift=(0,0,97)
            elif key=='P02_Snap_base':shift=(0,0,-28)
            elif key in ('P03_Face_bezel','H01_Bezel_adhesive'):shift=(0,-56,12)
            elif key=='P04_Adjustable_display_carrier' or key.startswith(('E01','E02','V0','H04','H05')):shift=(0,-29,12)
            elif key in ('P10_Touch_retaining_frame','E05_TTP223_MD0206_provisional'):shift=(0,0,53)
            elif key in ('P11_Speaker_retainer','E06_3020_speaker_PAL36','H02_Speaker_gasket'):shift=(0,35,15)
            elif key.startswith(('P05','P06','P07','E03','E04','H07')):shift=(0,0,20)
            elif key.startswith(('E09','E10','H09')):shift=(0,0,6)
            elif p['category']=='hardware':continue
        if mode=='section':
            # Cutaway retains right half, exposing actual battery, PCB and latches.
            if key in ('P01_Upper_shell','P02_Snap_base'):
                shape=p['shape'].intersect(model.box(60,130,110,30,0,-5))
            else:shape=p['shape']
        else:shape=p['shape']
        if not shape.Solids():continue
        ren.AddActor(actor(shape,p['color'],shift,alpha))
    light=vtk.vtkLight();light.SetPosition(-100,-130,200);light.SetFocalPoint(0,0,40);light.SetIntensity(.8);ren.AddLight(light)
    fill=vtk.vtkLight();fill.SetPosition(150,50,130);fill.SetFocalPoint(0,0,40);fill.SetIntensity(.45);ren.AddLight(fill)
    ren.SetUseDepthPeeling(True);ren.SetMaximumNumberOfPeels(100);ren.SetOcclusionRatio(.1)
    win=vtk.vtkRenderWindow();win.AddRenderer(ren);win.SetSize(1700,1500);win.SetOffScreenRendering(1);win.SetAlphaBitPlanes(1);win.SetMultiSamples(0)
    cam=ren.GetActiveCamera();cam.SetPosition(*camera);cam.SetFocalPoint(0,0,60 if mode=='exploded' else 35);cam.SetViewUp(0,0,1);cam.ParallelProjectionOn()
    ren.ResetCamera();cam.Zoom(1.12 if mode!='exploded' else 1.0);ren.ResetCameraClippingRange();win.Render()
    capture=vtk.vtkWindowToImageFilter();capture.SetInput(win);capture.SetInputBufferTypeToRGB();capture.ReadFrontBufferOff();capture.Update()
    path=ROOT/'drawings'/filename
    writer=vtk.vtkPNGWriter();writer.SetFileName(str(path));writer.SetInputConnection(capture.GetOutputPort());writer.Write();win.Finalize()
    image=Image.open(path).convert('RGB')
    canvas=Image.new('RGB',(1700,1720),'#F3F4F1');canvas.paste(image,(0,130))
    d=ImageDraw.Draw(canvas)
    regular='C:/Windows/Fonts/arial.ttf';bold='C:/Windows/Fonts/arialbd.ttf'
    d.text((75,35),title,font=ImageFont.truetype(bold,38),fill='#244341')
    d.text((75,90),subtitle,font=ImageFont.truetype(regular,22),fill='#5C6F6A')
    d.line((75,1635,1625,1635),fill='#C9D2CC',width=2)
    d.text((75,1660),'AURA / R1     |     actual CAD geometry     |     mm     |     prototype fit verification required',font=ImageFont.truetype(regular,20),fill='#65716B')
    canvas.save(path)
    print(path,flush=True)

if __name__=='__main__':
    with contextlib.redirect_stdout(io.StringIO()):model.build()
    render('01_Assembled.png','Aura / rechargeable desk companion','90 W x 78 D x 74 H shell | snap-fit base | round GC9A01 display')
    render('02_Rear_ports.png','Charging and service access','Rear USB-C inlet, recessed RUN / CHG toggle, speaker grille',camera=(125,175,105))
    render('03_Internal_layout.png','The component layout','Shell removed; translucent base exposes the battery and power modules',mode='internal',camera=(-125,-150,160))
    render('04_Exploded.png','Assembly order and separate parts','Printed parts and purchased-module envelopes shown separated for review',mode='exploded',camera=(-150,-220,145))
    render('05_Cutaway.png','Section through the assembled device','Right half of shell retained; geometry shown at its assembled coordinates',mode='section',camera=(-170,-150,105))
