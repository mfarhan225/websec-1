// lib/jwt-keys.ts

// ====== Konstanta & util ======
const MIN_BYTES = 64;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function decodeBase64UrlToBytes(b64url: string): Uint8Array {
  const normalized = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const base64 = normalized + "=".repeat(padLen);

  // Browser/Edge runtime
  if (typeof atob === "function") {
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node.js
  // @ts-ignore
  return Buffer.from(base64, "base64");
}

function byteLengthOfSecret(val: string): number {
  if (BASE64URL_RE.test(val)) {
    try {
      return decodeBase64UrlToBytes(val).byteLength;
    } catch {
      // fallback ke UTF-8 length
    }
  }
  return new TextEncoder().encode(val).byteLength;
}

function assertStrong(name: string, val?: string) {
  if (!val) throw new Error(`${name} is missing`);
  const bytes = byteLengthOfSecret(val);
  if (bytes < MIN_BYTES) {
    throw new Error(`${name} too short; need >= ${MIN_BYTES} bytes of entropy`);
  }
}

// ====== Lazy loader + cache ======
type LoadedKeys = {
  jwtKeys: Record<string, string>;
  currentKid: string;
};
let _cache: LoadedKeys | null = null;

function loadKeys(): LoadedKeys {
  const KID = process.env.CREDENSE_JWT_KID || "current";
  const CURRENT = process.env[`CREDENSE_JWT_SECRET_${KID}` as const];
  const OLD = process.env.CREDENSE_JWT_SECRET_old; // optional

  // Validasi (baru dilakukan saat dipanggil di runtime, bukan saat import)
  assertStrong(`CREDENSE_JWT_SECRET_${KID}`, CURRENT);
  if (OLD) assertStrong("CREDENSE_JWT_SECRET_old", OLD);

  if (process.env.NODE_ENV === "production" && process.env.CREDENSE_JWT_KID == null) {
    console.warn(
      "[credense] CREDENSE_JWT_KID is not set in production; defaulting to 'current'. " +
      "Consider using versioned KIDs (e.g., v1, v2) for clearer rotations."
    );
  }

  return {
    jwtKeys: {
      [KID]: CURRENT as string,
      ...(OLD ? { old: OLD } : {}),
    },
    currentKid: KID,
  };
}

// ====== API publik (dipakai oleh route/middleware) ======
export function getJwtKeys(): Record<string, string> {
  if (!_cache) _cache = loadKeys();
  return _cache.jwtKeys;
}
export function getCurrentKid(): string {
  if (!_cache) _cache = loadKeys();
  return _cache.currentKid;
}
export function getCurrentSecret(): string {
  const keys = getJwtKeys();
  return keys[getCurrentKid()];
}

// Kalau butuh bentuk byte:
export function getCurrentKeyBytes(): Uint8Array {
  const secret = getCurrentSecret();
  // Jika lib kamu butuh raw bytes: encode UTF-8.
  return new TextEncoder().encode(secret);
}
