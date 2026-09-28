import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export type GalleryRole = "admin" | "viewer";
const cookieName = "aura_gallery_session";
const duration = 12 * 60 * 60;

function secret() {
  const value = process.env.AURA_GALLERY_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Configure AURA_GALLERY_SESSION_SECRET with at least 32 characters.");
  return value;
}

export function matches(value: string, expected: string) {
  const left = Buffer.from(value), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function galleryRole(request: Request): GalleryRole | null {
  try {
    const token = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    if (!matches(signature, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isFinite(session.expires) || session.expires < Date.now()) return null;
    return session.role === "admin" || session.role === "viewer" ? session.role : null;
  } catch { return null; }
}

export function loginResponse(role: GalleryRole, request: Request) {
  const payload = Buffer.from(JSON.stringify({ role, expires: Date.now() + duration * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  const response = NextResponse.json({ unlocked: true, role }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(cookieName, `${payload}.${signature}`, {
    httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/api/gallery", maxAge: duration,
  });
  return response;
}

export function sameOrigin(request: Request) {
  try { return new URL(request.headers.get("origin") || "").host === request.headers.get("host"); }
  catch { return false; }
}

export function requireAdmin(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This request must come from this website." }, { status: 403 });
  if (galleryRole(request) !== "admin") return NextResponse.json({ error: "Sign in as admin to make changes." }, { status: 403 });
  return null;
}

export function logoutResponse() {
  const response = NextResponse.json({ locked: true });
  response.cookies.set(cookieName, "", { path: "/api/gallery", maxAge: 0 });
  return response;
}
