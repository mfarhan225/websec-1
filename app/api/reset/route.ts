// app/api/reset/route.ts
export const dynamic = 'force-dynamic';   // cegah prerender/collect saat build
export const revalidate = 0;              // jangan cache respons API

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyPasswordResetToken,
  isResetJtiUsed,
  markResetJtiUsed,
  updateUserPassword,
  getUserById,
} from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(12).max(72),
});

function strong(pw: string) {
  return /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
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

  // Validasi payload
  let token: string, password: string;
  try {
    const p = schema.parse(await req.json());
    token = p.token;
    password = p.password;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!strong(password)) {
    return json(
      { ok: false, error: "Weak password. Use upper, lower, number, and symbol." },
      { status: 400 }
    );
  }

  try {
    const payload = await verifyPasswordResetToken(token); // pakai kunci JWT via lib/auth (lazy)
    if (isResetJtiUsed(payload.jti)) {
      return json({ ok: false, error: "Token already used" }, { status: 400 });
    }

    const user = await getUserById(payload.sub);
    if (!user) {
      // Perlakuan generik (hindari enumeration)
      markResetJtiUsed(payload.jti);
      return json({ ok: false, error: "Invalid token" }, { status: 400 });
    }

    await updateUserPassword(user.id, password);
    markResetJtiUsed(payload.jti);

    // (Catatan produksi: idealnya revoke sesi aktif / rotate signing key)
    return json({ ok: true, message: "Password updated. Please login." });
  } catch {
    return json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }
}
