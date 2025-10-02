// app/api/reset/route.ts
export const dynamic = "force-dynamic";   // cegah prerender/collect saat build
export const revalidate = 0;              // no-cache

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyPasswordResetToken,
  isResetJtiUsed,
  markResetJtiUsed,
  updateUserPassword,
  getUserById,
  revokeAllSessions,
} from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(12).max(72),
});

function strong(pw: string) {
  return (
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

// Random delay untuk meredam timing-oracle (200–600ms)
async function randomDelay(minMs = 200, maxMs = 600) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const json = (b: any, i?: ResponseInit) => {
    const r = NextResponse.json(b, i);
    r.headers.set("Cache-Control", "no-store");
    r.headers.set("Pragma", "no-cache");
    r.headers.set("Expires", "0");
    return r;
  };

  // ✅ CSRF check
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  // ✅ Validasi payload
  let token: string, password: string;
  try {
    const p = schema.parse(await req.json());
    token = p.token.trim();              // ⬅️ sanitize token
    password = p.password;
  } catch {
    await randomDelay();
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // ✅ Password policy
  if (!strong(password)) {
    await randomDelay();
    return json(
      { ok: false, error: "Weak password. Use upper, lower, number, and symbol." },
      { status: 400 }
    );
  }

  try {
    const payload = await verifyPasswordResetToken(token); // lazy JWT verify

    // Single-use JTI (jawab generik agar anti-enumeration)
    if (isResetJtiUsed(payload.jti)) {
      await randomDelay();
      return json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await getUserById(payload.sub);
    if (!user) {
      // generik + tandai token terpakai supaya tidak bisa dicoba lagi
      markResetJtiUsed(payload.jti);
      await randomDelay();
      return json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }

    await updateUserPassword(user.id, password);
    markResetJtiUsed(payload.jti);

    // 🔒 Revoke semua sesi aktif user (nilai plus keamanan)
    revokeAllSessions(user.id);

    return json({ ok: true, message: "Password updated. Please login." });
  } catch {
    await randomDelay();
    return json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }
}
