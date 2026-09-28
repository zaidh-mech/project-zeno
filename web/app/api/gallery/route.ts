import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { galleryRole, requireAdmin } from "@/lib/gallery-auth";
import { editAlbum, publicMemory, readAlbum } from "@/lib/gallery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const role = galleryRole(request);
  if (!role) return NextResponse.json({ error: "Unlock the album first." }, { status: 401 });
  try {
    const album = await readAlbum();
    return NextResponse.json({ role, memories: album.filter(memory => role === "admin" || memory.photo).map(publicMemory) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Couldn’t load the album. Try again." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const memory = await editAlbum(async album => {
      if (album.length >= 100) return null;
      const memory = { id: randomUUID(), caption: "", story: "", photo: "", mime: "" };
      album.push(memory); return memory;
    });
    if (!memory) return NextResponse.json({ error: "This album holds up to 100 memories." }, { status: 400 });
    return NextResponse.json({ memory: publicMemory(memory) }, { status: 201 });
  } catch { return NextResponse.json({ error: "Couldn’t save the memory. Check the server’s gallery storage." }, { status: 500 }); }
}
