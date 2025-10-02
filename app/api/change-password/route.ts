// app/api/change-password/route.ts
export const dynamic = "force-dynamic"; // cegah prerender/collect saat build
export const revalidate = 0;            // jangan cache respons API

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCsrf } from "@/lib/csrf";
import {
  verifySession,
  updateUserPassword,
  getUserById,
  verifyPassword,
  revokeAllSessions,   // ⬅️ revoke SEMUA sesi user ini
} from "@/lib/auth";

/** Validasi input */
const schema = z.object({
  oldPassword: z.string().min(1),            // harus diisi
  newPassword: z.string().min(12).max(72),   // panjang aman untuk bcrypt
});

/** Password policy tambahan */
function strong(pw: string) {
  return (
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

/** Helper ambil cookie */
function getCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function POST(req: Request) {
  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  };

  // 1) ✅ CSRF
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  // 2) ✅ Ambil token dari cookie
  const token = getCookie(req.headers.get("cookie"), "credense_session");
  if (!token) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // 3) ✅ Parse & validasi input
  let oldPassword: string, newPassword: string;
  try {
    const parsed = schema.parse(await req.json());
    oldPassword = parsed.oldPassword;
    newPassword = parsed.newPassword;
  } catch {
    return json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!strong(newPassword)) {
    return json(
      { ok: false, error: "Weak password. Use upper, lower, number, and symbol." },
      { status: 400 }
    );
  }

  // 4) ✅ Verifikasi sesi + ambil user
  let userId: string;
  try {
    const payload = await verifySession(token);
    userId = payload.id;
  } catch {
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // 5) ✅ Verifikasi oldPassword
  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) return json({ ok: false, error: "Old password incorrect" }, { status: 400 });

  // 6) ✅ Update password
  await updateUserPassword(user.id, newPassword);

  // 7) ✅ Revoke SEMUA sesi user ini (global logout) — poin plus keamanan
  revokeAllSessions(user.id);

  // 8) ✅ Hapus cookie sesi → paksa login ulang
  const res = json(
    { ok: true, message: "Password updated. Please login again." },
    { status: 200 }
  );
  res.cookies.set({
    name: "credense_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
