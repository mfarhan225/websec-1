// app/api/me/route.ts
export const dynamic = "force-dynamic"; // jangan cache di build
export const revalidate = 0;            // no cache

import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth"; // ✅ pakai JWT verify dari lib/auth
import { verifyCsrf } from "@/lib/csrf";

export async function GET(req: Request) {
  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  };

  // ✅ CSRF check (opsional untuk GET, tapi biar konsisten aman)
  const v = verifyCsrf(req);
  if (!v.ok) return json({ ok: false, error: "CSRF failed" }, { status: 403 });

  try {
    const cookie = req.headers.get("cookie") || "";
    const match = /credense_session=([^;]+)/.exec(cookie);
    if (!match) return json({ ok: false, error: "No session" }, { status: 401 });

    const token = match[1];
    const payload = await verifySession(token);

    return json({
      ok: true,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (err) {
    console.error("ME route error:", err);
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
