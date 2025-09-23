// app/api/forgot/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, signPasswordResetToken } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

// rate-limit sederhana (IP+email)
type RL = { count: number; first: number };
const rl = new Map<string, RL>();
const MAX = 5;
const WINDOW = 15 * 60_000;

const schema = z.object({ email: z.string().email() });

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
}
function key(ip: string, email: string) { return `${ip}|${email}`; }
function attempts(k: string) {
  const now = Date.now();
  const s = rl.get(k);
  if (!s || now - s.first > WINDOW) return 0;
  return s.count;
}
function bump(k: string) {
  const now = Date.now();
  const s = rl.get(k);
  if (!s || now - s.first > WINDOW) rl.set(k, { count: 1, first: now });
  else rl.set(k, { count: s.count + 1, first: s.first });
}

export async function POST(req: Request) {
  const json = (b: any, i?: ResponseInit) => {
    const r = NextResponse.json(b, i);
    r.headers.set("Cache-Control", "no-store");
    return r;
  };

  // CSRF
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  // Validasi
  let email: string;
  try {
    const p = schema.parse(await req.json());
    email = p.email.trim().toLowerCase();
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Rate limit
  const ip = getIp(req);
  const k = key(ip, email);
  if (attempts(k) >= MAX) {
    return json({ ok: true, message: "If that account exists, you'll receive reset instructions shortly." });
  }

  // Anti-enumeration: selalu balas generik
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const token = await signPasswordResetToken(user);
      // DEMO: tampilkan token di console; di dev juga kirimkan di respons
      console.warn(`[DEV] Password reset token for ${email}: ${token}`);
      if (process.env.NODE_ENV !== "production") {
        bump(k);
        return json({
          ok: true,
          message: "If that account exists, you'll receive reset instructions shortly.",
          devToken: token,
          // Untuk tugas: buka /reset?token=<token>
        });
      }
    }
    bump(k);
    return json({ ok: true, message: "If that account exists, you'll receive reset instructions shortly." });
  } catch {
    bump(k);
    return json({ ok: true, message: "If that account exists, you'll receive reset instructions shortly." });
  }
}
