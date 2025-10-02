// app/api/forgot/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, signPasswordResetToken } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import {
  getClientIp,
  rlKey,
  rlIsBlocked,
  rlBumpFailure,
  DEFAULT_RL,
} from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

// Delay acak kecil untuk samarkan timing
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

  // 2) Parse & validate
  let email: string;
  try {
    const parsed = schema.parse(await req.json());
    email = parsed.email.trim().toLowerCase();
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // 3) Rate limit (IP+email), bucket "forgot"
  const ip = getClientIp(req);
  const key = rlKey(ip, email, "forgot");
  const blocked = rlIsBlocked(key);
  if (blocked.blocked) {
    await randomDelay();
    // Tetap respon generik (anti-enumeration) + Retry-After
    return json(
      { ok: true, message: "If that account exists, you'll receive reset instructions shortly." },
      { status: 200, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  // 4) Proses utama — SELALU balas generik
  try {
    const user = await getUserByEmail(email);

    if (user) {
      const token = await signPasswordResetToken(user);

      // DEV only: log token; JANGAN kirim ke klien
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[DEV] Password reset token for ${email}: ${token}`);
      }

      // TODO (produksi): kirim email berisi link reset
      // const origin = req.headers.get("origin") ?? new URL(req.url).origin;
      // const link = `${origin}/reset?token=${encodeURIComponent(token)}`;
    }

    // Penting: hitung sebagai attempt juga (anti-spam), jangan reset counter
    rlBumpFailure(key, DEFAULT_RL);

    await randomDelay();
    return json({
      ok: true,
      message: "If that account exists, you'll receive reset instructions shortly.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);

    // Gagal pun dihitung attempt (tetap generik)
    rlBumpFailure(key, DEFAULT_RL);

    await randomDelay();
    return json({
      ok: true,
      message: "If that account exists, you'll receive reset instructions shortly.",
    });
  }
}
