// lib/session-revoke.ts
// In-memory revoked session store (demo).
// Bisa diganti dengan Redis/DB untuk produksi.

type RevokedRecord = {
  exp: number; // epoch detik
};

const revoked = new Map<string, RevokedRecord>();

/**
 * Revoke a session JTI until token expiry.
 * @param jti unique session ID from JWT
 * @param exp expiry time (epoch seconds)
 */
export function revokeSessionJti(jti: string, exp?: number) {
  const ttl = exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 2; // default 2h
  revoked.set(jti, { exp: ttl });
}

/**
 * Check if a JTI has been revoked.
 */
export function isSessionRevoked(jti: string | undefined): boolean {
  if (!jti) return true;
  const rec = revoked.get(jti);
  if (!rec) return false;

  // expired record → cleanup
  const now = Math.floor(Date.now() / 1000);
  if (rec.exp < now) {
    revoked.delete(jti);
    return false;
  }
  return true;
}

/**
 * Cleanup expired revoked JTIs (optional housekeeping).
 */
export function cleanupRevoked() {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, rec] of revoked.entries()) {
    if (rec.exp < now) revoked.delete(jti);
  }
}
