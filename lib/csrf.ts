// lib/csrf.ts
import { NextResponse } from "next/server";

export const CSRF_COOKIE = "credense_csrf";
export const CSRF_HEADER = "x-csrf-token";

// Base64url encode kompatibel Edge/Node
function toBase64Url(bytes: Uint8Array): string {
  let b64: string;
  // @ts-ignore
  if (typeof Buffer !== "undefined") {
    // Node
    // @ts-ignore
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    // @ts-ignore
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createCsrfToken(len = 32): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const A = enc.encode(a);
  const B = enc.encode(b);
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

function getCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function verifyCsrf(req: Request): { ok: true } | { ok: false; error: string } {
  const tokenCookie = getCookie(req.headers.get("cookie"), CSRF_COOKIE);
  const tokenHeader = req.headers.get(CSRF_HEADER) || "";
  if (!tokenCookie || !tokenHeader) return { ok: false, error: "Missing CSRF token" };
  return constantTimeEqual(tokenCookie, tokenHeader)
    ? { ok: true }
    : { ok: false, error: "Invalid CSRF token" };
}

export function setCsrfCookie(res: NextResponse, token?: string, maxAgeSeconds = 60 * 60 * 2) {
  const t = token ?? createCsrfToken();
  res.cookies.set({
    name: CSRF_COOKIE,
    value: t,
    httpOnly: false, // perlu bisa dibaca JS → dikirim ulang via header
    secure: process.env.NODE_ENV === "production", // ⬅️ aman di prod, fleksibel di dev
    sameSite: "lax", // ⬅️ lebih user-friendly, masih cukup aman
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return t;
}
