// app/reset/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withCsrfHeader } from "@/lib/csrf-client";

function checks(pw: string) {
  return {
    len: pw.length >= 12,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}
function allOk(c: ReturnType<typeof checks>) {
  return c.len && c.lower && c.upper && c.digit && c.symbol;
}

// ← Pindahkan logika lama ke komponen "inner" yang akan dibungkus Suspense
function ResetInner() {
  const r = useRouter();
  const sp = useSearchParams();                    // ✅ aman di dalam <Suspense>
  const tokenFromUrl = sp.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { setToken(tokenFromUrl); }, [tokenFromUrl]);

  const c = useMemo(() => checks(pw), [pw]);
  const valid = allOk(c) && pw === pw2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!valid) { setErr("Password belum memenuhi syarat atau tidak sama."); return; }

    const res = await fetch(
      "/api/reset",
      withCsrfHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      })
    );
    const data = await res.json();
    if (res.ok) {
      setMsg("Password updated. Silakan login.");
      r.push("/login");
    } else {
      setErr(data.error || "Reset failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-md p-6">
        <h1 className="text-2xl font-semibold mb-4">Reset Password</h1>

        {err && <p className="text-red-200 text-sm mb-3">{err}</p>}
        {msg && <p className="text-emerald-200 text-sm mb-3">{msg}</p>}

        <form onSubmit={submit} className="space-y-3">
          <textarea
            className="w-full h-20 px-3 py-2 rounded-lg bg-white/90 text-black"
            placeholder="Token dari email (demo: dari halaman Forgot)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <input
            className="w-full px-3 py-2 rounded-lg bg-white/90 text-black"
            placeholder="Password baru (min 12, Aa1!)"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
          <input
            className="w-full px-3 py-2 rounded-lg bg-white/90 text-black"
            placeholder="Ulangi password baru"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
          />

          <div className="text-xs text-white/80 space-y-1 rounded-md bg-white/5 p-3">
            <div className={c.len ? "text-emerald-300" : "text-red-300"}>{c.len ? "✓" : "•"} Minimal 12 karakter</div>
            <div className={c.lower ? "text-emerald-300" : "text-red-300"}>{c.lower ? "✓" : "•"} Huruf kecil (a–z)</div>
            <div className={c.upper ? "text-emerald-300" : "text-red-300"}>{c.upper ? "✓" : "•"} Huruf besar (A–Z)</div>
            <div className={c.digit ? "text-emerald-300" : "text-red-300"}>{c.digit ? "✓" : "•"} Angka (0–9)</div>
            <div className={c.symbol ? "text-emerald-300" : "text-red-300"}>{c.symbol ? "✓" : "•"} Simbol (mis. !@#$%)</div>
            {pw && (
              <div className={pw === pw2 ? "text-emerald-300" : "text-red-300"}>
                {pw === pw2 ? "✓" : "•"} Kedua password sama
              </div>
            )}
          </div>

          <button
            className="w-full py-2 rounded-lg font-medium bg-black/80 text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!valid}
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}

// Page component berisi Suspense boundary
export default function ResetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading…</div>}>
      <ResetInner />
    </Suspense>
  );
}
