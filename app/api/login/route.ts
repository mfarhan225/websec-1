// app/api/login/route.ts
export const dynamic = 'force-dynamic';  // ⬅️ cegah prerender/collect di build
export const revalidate = 0;             // ⬅️ jangan cache respons API

import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, verifyPassword, signSession } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ---- Simple rate limiter (in-memory) ----
type RLState = { count: number; first: number; blockedUntil?: number };
const rl = new Map<string, RLState>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 10 * 60_000;

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  return ip;
}
function rlKey(ip: string, email: string) { return `${ip}|${email}`; }
function isBlocked(key: string) {
  const s = rl.get(key);
  if (!s) return false;
  const now = Date.now();
  if (s.blockedUntil && now < s.blockedUntil) return true;
  if (s.blockedUntil && now >= s.blockedUntil) rl.delete(key);
  return false;
}
function recordAttempt(key: string, success: boolean) {
  const now = Date.now();
  let s = rl.get(key);
  if (!s || now - s.first > WINDOW_MS) s = { count: 0, first: now };
  if (success) { rl.delete(key); return; }
  s.count += 1;
  if (s.count >= MAX_ATTEMPTS) s.blockedUntil = now + BLOCK_MS;
  rl.set(key, s);
}

export async function POST(req: Request) {
  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  // CSRF (double-submit cookie/header)
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  // Validasi payload
  let email: string, password: string;
  try {
    const parsed = schema.parse(await req.json());
    email = parsed.email.trim().toLowerCase();
    password = parsed.password;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Rate limit
  const ip = getClientIp(req);
  const key = rlKey(ip, email);
  if (isBlocked(key)) {
    return json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      recordAttempt(key, false);
      return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      recordAttempt(key, false);
      return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    recordAttempt(key, true);

    const token = await signSession({ id: user.id, role: user.role, email: user.email });

    const res = json({ ok: true });
    res.cookies.set({
      name: "credense_session",  // ⬅️ pastikan nama ini dipakai konsisten di middleware
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",           // ⬅️ Lax biasanya cukup aman & lebih kompatibel
      path: "/",
      maxAge: 60 * 60 * 2,       // 2 jam
    });
    return res;
  } catch {
    recordAttempt(key, false);
    return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }
}
