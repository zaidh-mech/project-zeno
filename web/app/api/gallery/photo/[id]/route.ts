import { NextResponse } from "next/server";
import { galleryRole, requireAdmin } from "@/lib/gallery-auth";
import { editAlbum, publicMemory, readAlbum, readPhoto, removePhoto, savePhoto } from "@/lib/gallery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const maxBytes = 8 * 1024 * 1024;

export async function GET(request: Request, context: Context) {
  if (!galleryRole(request)) return NextResponse.json({ error: "Unlock the album first." }, { status: 401 });
  try {
    const { id } = await context.params;
    const memory = (await readAlbum()).find(item => item.id === id);
    if (!memory?.photo) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(await readPhoto(memory.photo)), { headers: { "Content-Type": memory.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Couldn’t load this photo." }, { status: 500 }); }
}

export async function POST(request: Request, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > maxBytes + 4096) return NextResponse.json({ error: "Choose a photo smaller than 8 MB." }, { status: 413 });
  try {
    const file = (await request.formData()).get("photo");
    if (!(file instanceof File) || !file.size || file.size > maxBytes) return NextResponse.json({ error: "Choose a photo smaller than 8 MB." }, { status: 400 });
    const data = Buffer.from(await file.arrayBuffer());
    const mime = data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255 ? "image/jpeg"
      : ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString()) ? "image/gif"
      : data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "";
    if (!mime) return NextResponse.json({ error: "Choose a JPG, PNG, WebP or GIF photo." }, { status: 400 });
    const { id } = await context.params;
    let oldPhoto = "";
    const memory = await editAlbum(async album => {
      const memory = album.find(item => item.id === id);
      if (!memory) return null;
      const filename = await savePhoto(data);
      oldPhoto = memory.photo; memory.photo = filename; memory.mime = mime;
      return memory;
    });
    if (!memory) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    if (oldPhoto) await removePhoto(oldPhoto).catch(() => {});
    return NextResponse.json({ memory: publicMemory(memory) });
  } catch { return NextResponse.json({ error: "Couldn’t upload this photo. Try again." }, { status: 500 }); }
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    let oldPhoto = "";
    const memory = await editAlbum(async album => {
      const memory = album.find(item => item.id === id);
      if (!memory) return null;
      oldPhoto = memory.photo; memory.photo = ""; memory.mime = "";
      return memory;
    });
    if (!memory) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    if (oldPhoto) await removePhoto(oldPhoto).catch(() => {});
    return NextResponse.json({ memory: publicMemory(memory) });
  } catch { return NextResponse.json({ error: "Couldn’t delete this photo. Try again." }, { status: 500 }); }
}
