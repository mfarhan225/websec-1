// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { jwtKeys, currentKid } from "./lib/jwt-keys";
import { CSRF_COOKIE, createCsrfToken } from "./lib/csrf";

const enc = new TextEncoder();
const keyBytes: Record<string, Uint8Array> = Object.fromEntries(
  Object.entries(jwtKeys).map(([kid, secret]) => [kid, enc.encode(secret)])
);
const ALG = "HS512" as const;

// ✅ Lindungi juga documents, audit, settings
const PROTECTED_PREFIXES = ["/dashboard", "/documents", "/audit", "/settings", "/clients", "/docs"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Seed CSRF cookie untuk semua request jika belum ada ---
  const hasCsrf = !!req.cookies.get(CSRF_COOKIE)?.value;
  const csrfSeed = hasCsrf ? undefined : createCsrfToken();

  const withCsrf = (res: NextResponse) => {
    if (csrfSeed) {
      res.cookies.set({
        name: CSRF_COOKIE,
        value: csrfSeed,
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 2, // 2 jam
      });
    }
    return res;
  };

  // Halaman publik (termasuk /, /login, /register, /forgot, /reset, assets)
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return withCsrf(NextResponse.next());
  }

  const isApi = pathname.startsWith("/api/");
  const accept = req.headers.get("accept") || "";
  const wantsHtml = !isApi && accept.includes("text/html");

  const token = req.cookies.get("credense_session")?.value;
  if (!token) {
    if (wantsHtml) return withCsrf(NextResponse.redirect(new URL("/login", req.url)));
    return withCsrf(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      async (header) => {
        if (header?.kid && keyBytes[header.kid]) return keyBytes[header.kid];
        return keyBytes[currentKid];
      },
      { algorithms: [ALG] }
    );

    const reqHeaders = new Headers(req.headers);
    if ((payload as any)?.id) reqHeaders.set("x-credense-userid", String((payload as any).id));
    if ((payload as any)?.role) reqHeaders.set("x-credense-role", String((payload as any).role));
    if ((payload as any)?.email) reqHeaders.set("x-credense-email", String((payload as any).email));
    if (protectedHeader?.kid) reqHeaders.set("x-credense-kid", String(protectedHeader.kid));

    const res = NextResponse.next({ request: { headers: reqHeaders } });
    res.headers.set("Cache-Control", "no-store");
    return withCsrf(res);
  } catch {
    if (wantsHtml) return withCsrf(NextResponse.redirect(new URL("/login", req.url)));
    return withCsrf(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }));
  }
}

// Jalankan middleware untuk semua path (agar bisa seed CSRF cookie)
export const config = {
  matcher: ["/:path*"],
};
