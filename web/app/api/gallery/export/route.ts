import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/gallery-auth";
import { exportGallery } from "@/lib/gallery-export";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try { return NextResponse.json({ count: await exportGallery() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn’t export the album." }, { status: 500 }); }
}
