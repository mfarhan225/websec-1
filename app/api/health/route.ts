// app/api/health/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.json(
    { ok: true, status: "healthy", ts: new Date().toISOString() },
    { status: 200 }
  );
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}
