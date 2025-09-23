// app/api/logout/route.ts
import { NextResponse } from "next/server";
import { verifyCsrf, setCsrfCookie } from "@/lib/csrf";

export async function POST(req: Request) {
  // ✅ Verifikasi CSRF
  const v = verifyCsrf(req);
  if (!v.ok) {
    const deny = NextResponse.json({ ok: false, error: "CSRF failed" }, { status: 403 });
    deny.headers.set("Cache-Control", "no-store");
    return deny;
  }

  // Sukses logout
  const res = NextResponse.json({ ok: true, message: "Logged out" }, { status: 200 });

  // Anti-cache
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // Hapus cookie sesi
  res.cookies.set({
    name: "credense_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  // (Opsional) Rotasi CSRF token baru setelah logout
  setCsrfCookie(res);

  return res;
}
