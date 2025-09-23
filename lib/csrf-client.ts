// lib/csrf-client.ts
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf";

export function getCsrfTokenFromCookie(name = CSRF_COOKIE): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function withCsrfHeader(init?: RequestInit): RequestInit {
  const token = getCsrfTokenFromCookie();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set(CSRF_HEADER, token);
  return { ...init, headers };
}
