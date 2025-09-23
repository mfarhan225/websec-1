// lib/jwt-keys.ts

// Minimum 64 byte (512-bit) untuk kekuatan setara HS512
const MIN_BYTES = 64;

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function decodeBase64UrlToBytes(b64url: string): Uint8Array {
  // Normalisasi ke base64 standar + padding
  const normalized = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const base64 = normalized + "=".repeat(padLen);

  if (typeof atob === "function") {
    // Runtime Edge/Browser
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node.js
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Buffer tersedia di Node runtime
  return Buffer.from(base64, "base64");
}

function byteLengthOfSecret(name: string, val: string): number {
  // Jika terlihat seperti base64url, coba decode lalu ukur byte sebenarnya.
  if (BASE64URL_RE.test(val)) {
    try {
      return decodeBase64UrlToBytes(val).byteLength;
    } catch {
      // Jika gagal decode, jatuhkan ke UTF-8 length agar tetap gagal di bawah ini bila terlalu pendek
    }
  }
  // Ukur sebagai UTF-8 (untuk secret non-base64url)
  return new TextEncoder().encode(val).byteLength;
}

function assertStrong(name: string, val?: string) {
  if (!val) throw new Error(`${name} is missing`);
  const bytes = byteLengthOfSecret(name, val);
  if (bytes < MIN_BYTES) {
    throw new Error(`${name} too short; need >= ${MIN_BYTES} bytes of entropy`);
  }
}

const KID = process.env.CREDENSE_JWT_KID || "current";
const CURRENT = process.env[`CREDENSE_JWT_SECRET_${KID}` as const];
const OLD = process.env.CREDENSE_JWT_SECRET_old; // optional

// Validasi kekuatan secret
assertStrong(`CREDENSE_JWT_SECRET_${KID}`, CURRENT);
if (OLD) assertStrong("CREDENSE_JWT_SECRET_old", OLD);

// Peringatan operasional (tanpa membocorkan nilai secret)
if (process.env.NODE_ENV === "production" && process.env.CREDENSE_JWT_KID == null) {
  // Tidak melempar error agar dev tetap bisa jalan, tapi beri sinyal di prod
  console.warn(
    "[credense] CREDENSE_JWT_KID is not set in production; defaulting to 'current'. " +
      "Consider using versioned KIDs (e.g., v1, v2) for clearer rotations."
  );
}

export const jwtKeys: Record<string, string> = {
  [KID]: CURRENT as string,
  ...(OLD ? { old: OLD } : {}),
};

export const currentKid = KID;

// (Opsional) helper untuk pemanggil yang ingin mendapatkan bytes siap pakai.
// Saat kamu siap menyamakan pemakaian di auth/middleware, bisa gunakan ini.
// export const keyBytes: Record<string, Uint8Array> = Object.fromEntries(
//   Object.entries(jwtKeys).map(([kid, secret]) => [kid, new TextEncoder().encode(secret)])
// );
