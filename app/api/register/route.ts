// app/api/register/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCsrf } from "@/lib/csrf";
import {
  getClientIp,
  rlKey,
  rlIsBlocked,
  rlBumpFailure,
  rlReset,
  DEFAULT_RL,
} from "@/lib/rate-limit";
import { createUser } from "@/lib/auth";

// Validasi payload: samakan dengan login (min 12)
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(72),
});

// Kebijakan kompleksitas: huruf kecil, besar, angka, simbol
function isStrongPassword(pw: string) {
  return (
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

// Sedikit delay untuk meredam timing oracle di kasus gagal
async function randomDelay(minMs = 200, maxMs = 600) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
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

  // 2) Parse input
  let email: string, password: string;
  try {
    const p = schema.parse(await req.json());
    email = p.email.trim().toLowerCase();
    password = p.password;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // 3) Rate limit (IP+email)
  const ip = getClientIp(req);
  const key = rlKey(ip, email, "register");
  const blocked = rlIsBlocked(key);
  if (blocked.blocked) {
    return json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  // 4) Password policy
  if (!isStrongPassword(password)) {
    rlBumpFailure(key, DEFAULT_RL);
    return json(
      { ok: false, error: "Weak password. Use upper, lower, number, and symbol." },
      { status: 400 }
    );
  }

  // 5) Buat user di in-memory store (lib/auth)
  try {
    await createUser(email, password, "client"); // createUser sudah meng-hash password
    rlReset(key); // sukses → reset limiter
    return json({ ok: true, message: "User registered. Please login." }, { status: 201 });
  } catch {
    // Misal email sudah ada → tanggapi generik agar tak bisa enumerasi
    rlBumpFailure(key, DEFAULT_RL);
    await randomDelay();
    return json({ ok: false, error: "Registration failed" }, { status: 400 });
  }
}
