import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/gallery-auth";
import { editAlbum, publicMemory, removePhoto } from "@/lib/gallery-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid memory." }, { status: 400 }); }
  if (!body || typeof body.caption !== "string" || body.caption.length > 140 || typeof body.story !== "string" || body.story.length > 5000) return NextResponse.json({ error: "Use up to 140 characters for the caption and 5,000 for the story." }, { status: 400 });
  const { id } = await context.params;
  try {
    const memory = await editAlbum(async album => {
      const memory = album.find(item => item.id === id);
      if (memory) { memory.caption = body.caption; memory.story = body.story; }
      return memory;
    });
    return memory ? NextResponse.json({ memory: publicMemory(memory) }) : NextResponse.json({ error: "Memory not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Couldn’t save this memory. Try again." }, { status: 500 }); }
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const removed = await editAlbum(async album => {
      const index = album.findIndex(item => item.id === id);
      return index < 0 ? null : album.splice(index, 1)[0];
    });
    if (!removed) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    if (removed.photo) await removePhoto(removed.photo).catch(() => {});
    return NextResponse.json({ deleted: true });
  } catch { return NextResponse.json({ error: "Couldn’t delete this memory. Try again." }, { status: 500 }); }
}
