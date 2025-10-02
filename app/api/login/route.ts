// app/api/login/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, signSession } from "@/lib/auth";   // ⬅️ verifyPassword dipindah
import { verifyPassword } from "@/lib/passwords";           // ⬅️ ambil dari passwords
import { verifyCsrf } from "@/lib/csrf";
import {
  getClientIp,
  rlKey,
  rlIsBlocked,
  rlBumpFailure,
  rlReset,
  DEFAULT_RL,
} from "@/lib/rate-limit";

// ---- Payload schema ----
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Random sleep helper untuk cegah timing oracle di kasus gagal */
async function randomDelay(minMs = 200, maxMs = 600) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((res) => setTimeout(res, ms));
}

export async function POST(req: Request) {
  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  };

  // 1) CSRF
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  // 2) Parse & validate payload
  let email: string, password: string;
  try {
    const parsed = schema.parse(await req.json());
    email = parsed.email.trim().toLowerCase();
    password = parsed.password;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // 3) Rate limit (IP+email)
  const ip = getClientIp(req);
  const key = rlKey(ip, email, "login");
  const blocked = rlIsBlocked(key);
  if (blocked.blocked) {
    return json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  // 4) Auth
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      rlBumpFailure(key, DEFAULT_RL);
      await randomDelay();
      return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      rlBumpFailure(key, DEFAULT_RL);
      await randomDelay();
      return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // success → reset counter
    rlReset(key);

    const token = await signSession({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    const res = json({ ok: true });
    res.cookies.set({
      name: "credense_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // dev http -> false, prod -> true
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 jam
    });
    return res;
  } catch {
    rlBumpFailure(key, DEFAULT_RL);
    await randomDelay();
    return json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }
}
