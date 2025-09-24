// lib/auth.ts
import * as bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { getJwtKeys, getCurrentKid } from "./jwt-keys";

export type Role = "admin" | "manager" | "client";
export type UserRecord = { id: string; email: string; passwordHash: string; role: Role };

// DEMO store in-memory (tidak persisten)
const users = new Map<string, UserRecord>();

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

// ---- JWT with jose (Edge-safe) ----
const ALG = "HS512" as const;
const enc = new TextEncoder();

// Cache untuk key bytes & KID
let _keyBytes: Record<string, Uint8Array> | null = null;
let _kid: string | null = null;

function ensureKeys() {
  if (!_keyBytes || !_kid) {
    const jwtKeys = getJwtKeys();          // ⬅️ baca ENV di runtime (lazy)
    _kid = getCurrentKid();
    _keyBytes = Object.fromEntries(
      Object.entries(jwtKeys).map(([kid, secret]) => [kid, enc.encode(secret)])
    );
  }
  return { keyBytes: _keyBytes!, kid: _kid! };
}

// -------- Session token --------
export async function signSession(payload: { id: string; role: Role; email: string }) {
  const { keyBytes, kid } = ensureKeys();
  const key = keyBytes[kid];
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: ALG, kid })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(key);
}

export async function verifySession(token: string) {
  const { keyBytes, kid } = ensureKeys();
  const { payload } = await jwtVerify(
    token,
    async (header) => {
      if (header?.kid && keyBytes[header.kid]) return keyBytes[header.kid];
      return keyBytes[kid];
    },
    { algorithms: [ALG] }
  );
  return payload as { id: string; role: Role; email: string; iat: number; exp: number };
}

// ---- DEMO user ops ----
export async function createUser(email: string, password: string, role: Role = "client") {
  if (users.has(email)) throw new Error("Email already registered");
  const rec: UserRecord = {
    id: crypto.randomUUID(),
    email,
    passwordHash: await hashPassword(password),
    role,
  };
  users.set(email, rec);
  return rec;
}

export async function getUserByEmail(email: string) {
  return users.get(email) ?? null;
}

export async function getUserById(id: string) {
  for (const u of users.values()) if (u.id === id) return u;
  return null;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const u = await getUserById(userId);
  if (!u) throw new Error("User not found");
  u.passwordHash = await hashPassword(newPassword);
  users.set(u.email, u);
  return u;
}

// -------- Password reset token (JWT 15 menit, single-use lewat jti) --------
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
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(keyBytes[kid]);
}

export async function verifyPasswordResetToken(token: string) {
  const { keyBytes, kid } = ensureKeys();
  const { payload } = await jwtVerify(
    token,
    async (header) => {
      if (header?.kid && keyBytes[header.kid]) return keyBytes[header.kid];
      return keyBytes[kid];
    },
    { algorithms: [ALG] }
  );
  if ((payload as any)?.typ !== "pwd_reset") throw new Error("Bad token type");
  return payload as { sub: string; email?: string; jti?: string; iat: number; exp: number };
}

// Single-use store (demo, in-memory)
const usedResetJti = new Set<string>();
export function isResetJtiUsed(j: string | undefined) {
  return !j ? true : usedResetJti.has(j);
}
export function markResetJtiUsed(j: string | undefined) {
  if (j) usedResetJti.add(j);
}
