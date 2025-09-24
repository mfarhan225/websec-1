// app/api/register/route.ts
export const dynamic = 'force-dynamic';   // cegah prerendering di build
export const revalidate = 0;              // jangan cache respons API

import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf"; // ✅ CSRF check

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(72), // tingkatkan minimal length
});

// Cek kompleksitas dasar: huruf kecil, besar, angka, simbol
function isStrongPassword(pw: string) {
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  return hasLower && hasUpper && hasDigit && hasSymbol;
}

// ---- Simple rate limiter (in-memory) ----
type RLState = { count: number; first: number };
const rl = new Map<string, RLState>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  return ip;
}
function rlKey(ip: string, email: string) {
  return `${ip}|${email}`;
}
function recordAttempt(key: string) {
  const now = Date.now();
  const cur = rl.get(key);
  if (!cur || now - cur.first > WINDOW_MS) {
    rl.set(key, { count: 1, first: now });
  } else {
    rl.set(key, { count: cur.count + 1, first: cur.first });
  }
}
function attemptsLeft(key: string) {
  const s = rl.get(key);
  if (!s) return MAX_ATTEMPTS;
  const now = Date.now();
  if (now - s.first > WINDOW_MS) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - s.count);
}

export async function POST(req: Request) {
  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  // ✅ CSRF verification (double-submit)
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  let email: string;
  let password: string;

  // Validasi payload
  try {
    const parsed = schema.parse(await req.json());
    email = parsed.email.trim().toLowerCase();
    password = parsed.password;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const key = rlKey(ip, email);

  // Rate limit
  if (attemptsLeft(key) <= 0) {
    return json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  // Kebijakan password
  if (!isStrongPassword(password)) {
    recordAttempt(key);
    return json(
      { ok: false, error: "Weak password. Use upper, lower, number, and symbol." },
      { status: 400 }
    );
  }

  try {
    await createUser(email, password, "client");
    // (Opsional) audit log di sini
    return json({ ok: true, message: "User registered. Please login." }, { status: 201 });
  } catch {
    // Anti-enumeration: jangan bocorkan apakah email sudah terdaftar
    recordAttempt(key);
    return json({ ok: false, error: "Registration failed" }, { status: 400 });
  }
}
