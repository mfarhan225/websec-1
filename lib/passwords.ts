// lib/passwords.ts
import bcrypt from "bcryptjs";

/**
 * Bekukan nilai PEPPER di globalThis agar konsisten lintas HMR/route.
 * Jika .env berubah saat dev, nilai yang dipakai tetap sama sampai proses Node di-restart.
 */
declare global {
  // eslint-disable-next-line no-var
  var __AUTH_PEPPER: string | undefined;
}

const PEPPER =
  globalThis.__AUTH_PEPPER !== undefined
    ? globalThis.__AUTH_PEPPER
    : (globalThis.__AUTH_PEPPER = process.env.AUTH_PEPPER ?? "");

// Opsional: warning saat dev jika PEPPER kosong
if (process.env.NODE_ENV !== "production" && PEPPER === "") {
  // eslint-disable-next-line no-console
  console.warn("[auth] AUTH_PEPPER kosong; hashing tanpa pepper (DEV).");
}

/** Dipakai saat register & ganti password */
export async function hashPassword(raw: string) {
  return bcrypt.hash(raw + PEPPER, 12);
}

/** Dipakai saat login & verifikasi old password */
export async function verifyPassword(raw: string, hash: string) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(raw + PEPPER, hash);
  } catch {
    return false;
  }
}
