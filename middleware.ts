// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { CSRF_COOKIE, createCsrfToken } from "./lib/csrf";
import { getJwtKeys, getCurrentKid } from "./lib/jwt-keys";
import { isSessionRevoked } from "./lib/session-revoke";

const ALG = "HS512" as const;
const PROTECTED_PREFIXES = ["/dashboard", "/documents", "/audit", "/settings", "/clients", "/docs"];

// Samakan dengan lib/auth.ts
const ISSUER   = process.env.CREDENSE_JWT_ISSUER   || "credense";
const AUDIENCE = process.env.CREDENSE_JWT_AUDIENCE || "credense-web";

// ===== lazy cache utk kunci (tidak akses ENV saat import)
const enc = new TextEncoder();
let _keyBytes: Record<string, Uint8Array> | null = null;
let _kid: string | null = null;

function ensureKeys() {
  if (!_keyBytes || !_kid) {
    const jwtKeys = getJwtKeys();
    _kid = getCurrentKid();
    _keyBytes = Object.fromEntries(
      Object.entries(jwtKeys).map(([kid, secret]) => [kid, enc.encode(secret)])
    );
  }
  return { keyBytes: _keyBytes!, kid: _kid! };
}

// Tambahkan header keamanan + anti-cache ke setiap respons
function hardenResponse(res: NextResponse) {
  // Anti-cache (tambahan selain yang sudah ada di next.config/netlify)
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // Header keamanan yang aman untuk di-set berulang (override tidak masalah)
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

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
        httpOnly: false, // perlu bisa dibaca client untuk header x-csrf-token
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      });
    }
    return res;
  };

  // Halaman publik (termasuk assets)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return hardenResponse(withCsrf(NextResponse.next()));
  }

  const isApi = pathname.startsWith("/api/");
  const accept = req.headers.get("accept") || "";
  const wantsHtml = !isApi && accept.includes("text/html");

  const token = req.cookies.get("credense_session")?.value;
  if (!token) {
    if (wantsHtml) {
      return hardenResponse(
        withCsrf(NextResponse.redirect(new URL("/login", req.url)))
      );
    }
    return hardenResponse(
      withCsrf(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }))
    );
  }

  try {
    const { keyBytes, kid } = ensureKeys();

    const { payload, protectedHeader } = await jwtVerify(
      token,
      async (header) => {
        if (header?.kid && keyBytes[header.kid]) return keyBytes[header.kid];
        return keyBytes[kid];
      },
      {
        algorithms: [ALG],
        issuer: ISSUER,
        audience: AUDIENCE,
        clockTolerance: 5, // toleransi clock skew kecil
      }
    );

    // ⬅️ Wajib ada jti agar bisa di-revoke & dilacak
    const jti = (payload as any)?.jti as string | undefined;
    if (!jti || isSessionRevoked(jti)) {
      if (wantsHtml) {
        return hardenResponse(
          withCsrf(NextResponse.redirect(new URL("/login", req.url)))
        );
      }
      return hardenResponse(
        withCsrf(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }))
      );
    }

    // Teruskan identitas ke lapisan berikutnya via header internal
    const reqHeaders = new Headers(req.headers);
    if ((payload as any)?.id)    reqHeaders.set("x-credense-userid", String((payload as any).id));
    if ((payload as any)?.role)  reqHeaders.set("x-credense-role",  String((payload as any).role));
    if ((payload as any)?.email) reqHeaders.set("x-credense-email", String((payload as any).email));
    if (protectedHeader?.kid)    reqHeaders.set("x-credense-kid",   String(protectedHeader.kid));
    reqHeaders.set("x-credense-jti", jti);

    const res = NextResponse.next({ request: { headers: reqHeaders } });
    return hardenResponse(withCsrf(res));
  } catch {
    if (wantsHtml) {
      return hardenResponse(
        withCsrf(NextResponse.redirect(new URL("/login", req.url)))
      );
    }
    return hardenResponse(
      withCsrf(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }))
    );
  }
}

export const config = {
  matcher: ["/:path*"],
};
