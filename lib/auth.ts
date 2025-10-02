// lib/auth.ts
import { SignJWT, jwtVerify, JWTPayload, errors as JoseErrors } from "jose";
import { getJwtKeys, getCurrentKid } from "./jwt-keys";
import { hashPassword } from "./passwords";
export { verifyPassword } from "./passwords";


/**
 * Roles supported
 */
export type Role = "admin" | "manager" | "client";
export type UserRecord = { id: string; email: string; passwordHash: string; role: Role };

/**
 * ===== In-memory demo store (singleton via globalThis) =====
 */
declare global {
  // eslint-disable-next-line no-var
  var __usersByEmail: Map<string, UserRecord> | undefined;
  // eslint-disable-next-line no-var
  var __usersById: Map<string, UserRecord> | undefined;
  // eslint-disable-next-line no-var
  var __revokedSessionJti: Set<string> | undefined;
  // eslint-disable-next-line no-var
  var __activeSessions: Map<string, Set<string>> | undefined;
}

const usersByEmail = globalThis.__usersByEmail ?? new Map<string, UserRecord>();
const usersById    = globalThis.__usersById    ?? new Map<string, UserRecord>();
if (!globalThis.__usersByEmail) globalThis.__usersByEmail = usersByEmail;
if (!globalThis.__usersById)    globalThis.__usersById    = usersById;

/**
 * ===== JWT (Edge-safe) =====
 */
const ALG = "HS512" as const;
const enc = new TextEncoder();

/** JWT standard claims hardening */
const ISSUER = process.env.CREDENSE_JWT_ISSUER || "credense";
const AUDIENCE = process.env.CREDENSE_JWT_AUDIENCE || "credense-web";
const SESSION_TTL = "2h";
const RESET_TTL = "15m";
const CLOCK_TOLERANCE_S = 60;

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

/**
 * ===== Session Revocation (singleton) =====
 */
const revokedSessionJti = globalThis.__revokedSessionJti ?? new Set<string>();
if (!globalThis.__revokedSessionJti) globalThis.__revokedSessionJti = revokedSessionJti;

const activeSessions = globalThis.__activeSessions ?? new Map<string, Set<string>>();
if (!globalThis.__activeSessions) globalThis.__activeSessions = activeSessions;

function registerSession(userId: string, jti: string) {
  if (!activeSessions.has(userId)) activeSessions.set(userId, new Set());
  activeSessions.get(userId)!.add(jti);
}

export function revokeSessionJti(jti?: string) {
  if (jti) revokedSessionJti.add(jti);
}

export function revokeAllSessions(userId: string) {
  const set = activeSessions.get(userId);
  if (!set) return;
  for (const j of set) revokedSessionJti.add(j);
  activeSessions.delete(userId);
}

function isSessionRevoked(jti?: string, userId?: string) {
  if (!jti) return true;
  if (revokedSessionJti.has(jti)) return true;
  if (userId && !activeSessions.get(userId)?.has(jti)) return true;
  return false;
}

/**
 * ===== Utils =====
 */
function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

/**
 * ===== Session token (JWT) =====
 */
export async function signSession(payload: { id: string; role: Role; email: string }) {
  const { keyBytes, kid } = ensureKeys();
  const jti = crypto.randomUUID();
  const key = keyBytes[kid];

  const token = await new SignJWT({
    ...payload,
    typ: "session",
    jti,
  } as JWTPayload)
    .setProtectedHeader({ alg: ALG, kid })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setNotBefore(0)
    .setExpirationTime(SESSION_TTL)
    .sign(key);

  registerSession(payload.id, jti);
  return token;
}

export async function verifySession(token: string) {
  const { keyBytes, kid } = ensureKeys();

  try {
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
        clockTolerance: CLOCK_TOLERANCE_S,
      }
    );

    if ((payload as any)?.typ !== "session") {
      throw new JoseErrors.JWTInvalid("Invalid token type");
    }
    if (isSessionRevoked(payload.jti as string | undefined, payload.id as string | undefined)) {
      throw new JoseErrors.JWTInvalid("Session revoked");
    }
    if (!protectedHeader || protectedHeader.alg !== ALG) {
      throw new JoseErrors.JWTInvalid("Invalid header");
    }

    return payload as {
      id: string;
      role: Role;
      email: string;
      jti?: string;
      iat: number;
      exp: number;
      iss: string;
      aud: string | string[];
      typ: "session";
    };
  } catch {
    throw new Error("Invalid or expired session");
  }
}

/**
 * ===== DEMO user ops (in-memory singleton) =====
 */
export async function createUser(email: string, password: string, role: Role = "client") {
  const e = normalizeEmail(email);
  if (usersByEmail.has(e)) throw new Error("Email already registered");
  const rec: UserRecord = {
    id: crypto.randomUUID(),
    email: e,
    passwordHash: await hashPassword(password), // hashing via lib/passwords
    role,
  };
  usersByEmail.set(e, rec);
  usersById.set(rec.id, rec);
  return rec;
}

export async function getUserByEmail(email: string) {
  return usersByEmail.get(normalizeEmail(email)) ?? null;
}

export async function getUserById(id: string) {
  return usersById.get(id) ?? null;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const u = await getUserById(userId);
  if (!u) throw new Error("User not found");
  u.passwordHash = await hashPassword(newPassword);
  usersByEmail.set(u.email, u);
  usersById.set(u.id, u);
  return u;
}

/**
 * ===== Password reset token (JWT) =====
 */
export async function signPasswordResetToken(user: UserRecord) {
  const { keyBytes, kid } = ensureKeys();
  const jti = crypto.randomUUID();

  return await new SignJWT({
    sub: user.id,
    email: user.email,
    typ: "pwd_reset",
    jti,
  } as JWTPayload)
    .setProtectedHeader({ alg: ALG, kid })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setNotBefore(0)
    .setExpirationTime(RESET_TTL)
    .sign(keyBytes[kid]);
}

export async function verifyPasswordResetToken(token: string) {
  const { keyBytes, kid } = ensureKeys();
  try {
    const { payload } = await jwtVerify(
      token,
      async (header) => {
        if (header?.kid && keyBytes[header.kid]) return keyBytes[header.kid];
        return keyBytes[kid];
      },
      {
        algorithms: [ALG],
        issuer: ISSUER,
        audience: AUDIENCE,
        clockTolerance: CLOCK_TOLERANCE_S,
      }
    );

    if ((payload as any)?.typ !== "pwd_reset") {
      throw new JoseErrors.JWTInvalid("Bad token type");
    }
    return payload as {
      sub: string;
      email?: string;
      jti?: string;
      iat: number;
      exp: number;
      iss: string;
      aud: string | string[];
      typ: "pwd_reset";
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/** Single-use reset JTI (demo) */
const usedResetJti = new Set<string>();
export function isResetJtiUsed(j: string | undefined) {
  return !j ? true : usedResetJti.has(j);
}
export function markResetJtiUsed(j: string | undefined) {
  if (j) usedResetJti.add(j);
}
