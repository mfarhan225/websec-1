// lib/rate-limit.ts
/**
 * Reusable in-memory rate limiter (demo)
 * --------------------------------------
 * - Window counter per "key" (contoh key = `${ip}|${email}`)
 * - Opsional "block" sementara setelah melewati limit
 * - Tidak pakai timer; state dibersihkan/diroll saat window lewat
 *
 * NOTE: Production → pindah ke Redis / KV dengan TTL.
 */

export type RateLimitOptions = {
  /** Max attempts di dalam jendela waktu */
  limit: number;
  /** Lebar jendela waktu (ms), contoh 15 menit = 15*60_000 */
  windowMs: number;
  /** Opsional: lama blok (ms) setelah melampaui limit (default: 10 menit) */
  blockMs?: number;
};

type RLState = { count: number; first: number; blockedUntil?: number };

const buckets = new Map<string, RLState>();

export const DEFAULT_RL: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60_000,
  blockMs: 10 * 60_000,
};

/** Util IP dari header proxy umum */
export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip =
    xf.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  return ip;
}

/** Gabungkan bagian jadi key stabil: ip|email|route dsb. */
export function rlKey(...parts: (string | number | undefined | null)[]): string {
  return parts
    .map((p) => String(p ?? "").trim().toLowerCase())
    .join("|");
}

/** Apakah key sedang diblok? Mengembalikan sisa retry-after (detik) jika ya */
export function rlIsBlocked(key: string): { blocked: true; retryAfter: number } | { blocked: false } {
  const now = Date.now();
  const s = buckets.get(key);
  if (!s) return { blocked: false };
  if (s.blockedUntil && now < s.blockedUntil) {
    return { blocked: true, retryAfter: Math.ceil((s.blockedUntil - now) / 1000) };
  }
  if (s.blockedUntil && now >= s.blockedUntil) {
    buckets.delete(key);
    return { blocked: false };
  }
  return { blocked: false };
}

/**
 * Cek counter di dalam window (tanpa menambah).
 * Berguna untuk menampilkan "attempts left".
 */
export function rlAttemptsLeft(key: string, opts: RateLimitOptions = DEFAULT_RL): number {
  const now = Date.now();
  const s = buckets.get(key);
  if (!s) return opts.limit;
  if (now - s.first > opts.windowMs) return opts.limit;
  return Math.max(0, opts.limit - s.count);
}

/** Catat kegagalan (increment counter). Jika lewat limit → set blockedUntil */
export function rlBumpFailure(key: string, opts: RateLimitOptions = DEFAULT_RL): void {
  const now = Date.now();
  const cur = buckets.get(key);
  let s: RLState;
  if (!cur || now - cur.first > opts.windowMs) {
    s = { count: 1, first: now };
  } else {
    s = { ...cur, count: cur.count + 1 };
  }
  if (s.count >= opts.limit) {
    const blockMs = opts.blockMs ?? 10 * 60_000;
    s.blockedUntil = now + blockMs;
  }
  buckets.set(key, s);
}

/** Catat sukses (reset counter window untuk key ini) */
export function rlReset(key: string): void {
  buckets.delete(key);
}

/* ===========================================================
 * Adaptor untuk konsistensi dengan rute-rute yang sudah ada
 * (ipFromRequest, rlCheck, rlFail, randomDelay)
 * ===========================================================
 */

export type RLParams = {
  key: string;           // contoh: `${ip}|${email}`
  max: number;           // contoh: 5
  windowMs: number;      // contoh: 15 * 60_000
  blockMs?: number;      // contoh: 10 * 60_000
};

export type RLStatus = {
  ok: boolean;
  retryAfter?: number;   // detik (untuk header Retry-After jika mau)
};

/** Alias agar naming seragam di route: */
export function ipFromRequest(req: Request): string {
  return getClientIp(req);
}

/** Wrapper status blokir */
export function rlCheck(params: RLParams): RLStatus {
  const { key, windowMs, max } = params;
  // reset window if elapsed
  const now = Date.now();
  const s = buckets.get(key);
  if (s && now - s.first > windowMs) buckets.delete(key);

  const blocked = rlIsBlocked(key);
  if ("blocked" in blocked && blocked.blocked) {
    return { ok: false, retryAfter: blocked.retryAfter };
  }
  // not strictly necessary to return attemptsLeft here; keep API minimal
  return { ok: true };
}

/** Wrapper kegagalan → naikkan counter/blokir */
export function rlFail(params: RLParams): void {
  rlBumpFailure(params.key, {
    limit: params.max,
    windowMs: params.windowMs,
    blockMs: params.blockMs,
  });
}

/** Random delay untuk meredam timing oracle */
export async function randomDelay(minMs = 200, maxMs = 600) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}
