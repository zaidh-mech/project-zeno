import { NextResponse } from "next/server";
import { loginResponse, logoutResponse, matches, sameOrigin } from "@/lib/gallery-auth";

export const runtime = "nodejs";
const budgets = { admin: { attempts: 0, resetAt: 0 }, viewer: { attempts: 0, resetAt: 0 } };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Open the gallery from this website." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your passcode." }, { status: 400 }); }
  const role = body?.role === "admin" ? "admin" : "viewer";
  const configured = role === "admin" ? process.env.AURA_GALLERY_ADMIN_PASSWORD : process.env.AURA_GALLERY_PIN;
  if (!configured || (role === "viewer" ? !/^\d{4}$/.test(configured) : configured.length < 12)) {
    return NextResponse.json({ error: role === "admin" ? "The admin password hasn’t been set yet." : "The gallery PIN hasn’t been set yet." }, { status: 503 });
  }
  const budget = budgets[role];
  if (Date.now() >= budget.resetAt) { budget.attempts = 0; budget.resetAt = Date.now() + 60_000; }
  if (budget.attempts >= 5) return NextResponse.json({ error: "Too many tries. Wait a minute, then try again." }, { status: 429 });
  const value = role === "admin" ? body.password : body.pin;
  if (typeof value !== "string" || !matches(value, configured)) {
    budget.attempts++;
    return NextResponse.json({ error: role === "admin" ? "That admin password doesn’t match." : "That PIN doesn’t match. Try again." }, { status: 401 });
  }
  try { return loginResponse(role, request); }
  catch { return NextResponse.json({ error: "The gallery session secret hasn’t been configured." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  return logoutResponse();
}
