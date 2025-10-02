// app/api/me/logout-all/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { verifyCsrf } from "@/lib/csrf";
import { verifySession, revokeAllSessions } from "@/lib/auth";

/** Ambil cookie sederhana dari header */
function getCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function POST(req: Request) {
  // Anti-cache helper
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

  // 2) Ambil token sesi dari cookie
  const token = getCookie(req.headers.get("cookie"), "credense_session");
  if (!token) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    // 3) Verifikasi sesi → dapatkan userId
    const payload = await verifySession(token);

    // 4) Revoke SEMUA sesi user ini (semua JTI)
    revokeAllSessions(payload.id);

    // 5) Hapus cookie sesi pada klien ini juga
    const res = json({ ok: true, message: "All sessions revoked" });
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
  } catch {
    // Token invalid / sudah revoked / expired
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
