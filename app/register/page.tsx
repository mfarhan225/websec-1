// app/register/page.tsx
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

export default function Register() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const c = useMemo(() => checks(password), [password]);
  const valid = allOk(c);
  const passed = [c.len, c.lower, c.upper, c.digit, c.symbol].filter(Boolean).length;
  const strength = !password ? "" : passed <= 2 ? "Lemah" : passed === 3 ? "Cukup" : "Kuat";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!valid) {
      setErr("Password belum memenuhi semua kriteria.");
      return;
    }

    const res = await fetch(
      "/api/register",
      withCsrfHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    );

    if (res.ok) {
      setMsg("Registered. Silakan login.");
      r.push("/login");
    } else {
      setErr((await res.json()).error || "Register failed");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--surface-border)] " +
    "bg-white dark:bg-white/10 px-3 py-2 text-sm text-primary " +
    "placeholder:text-neutral-500 dark:placeholder:text-neutral-300 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-400/70 dark:focus:ring-white/50";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="surface w-full max-w-md p-6 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
        <h1 className="text-2xl font-semibold text-primary mb-4">Credense — Register</h1>

        {err && (
          <p className="text-sm mb-3 text-red-600 dark:text-red-300" aria-live="assertive">
            {err}
          </p>
        )}
        {msg && (
          <p className="text-sm mb-3 text-emerald-700 dark:text-emerald-300" aria-live="polite">
            {msg}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            className={inputCls}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className={inputCls}
            placeholder="Password (min 12, Aa1!)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby="pw-help"
          />

          {/* Checklist kriteria (adaptif light/dark) */}
          <div id="pw-help" className="surface p-3">
            <ul className="text-sm space-y-1">
              <li className={c.len ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>
                {c.len ? "✓" : "•"} Minimal 12 karakter
              </li>
              <li className={c.lower ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>
                {c.lower ? "✓" : "•"} Mengandung huruf kecil (a–z)
              </li>
              <li className={c.upper ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>
                {c.upper ? "✓" : "•"} Mengandung huruf besar (A–Z)
              </li>
              <li className={c.digit ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>
                {c.digit ? "✓" : "•"} Mengandung angka (0–9)
              </li>
              <li className={c.symbol ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>
                {c.symbol ? "✓" : "•"} Mengandung simbol (mis. ! @ # $ % …)
              </li>
              {password && (
                <li className="pt-1 text-muted">
                  Kekuatan: <span className="font-medium text-primary">{strength}</span>
                </li>
              )}
            </ul>
          </div>

          <button
            className="w-full py-2 rounded-lg font-medium
                       bg-neutral-900 text-white hover:bg-black
                       disabled:opacity-60 disabled:cursor-not-allowed
                       dark:bg-white/20 dark:text-white dark:hover:bg-white/30
                       focus:outline-none focus:ring-2 focus:ring-indigo-400/70 dark:focus:ring-white/50"
            disabled={!valid}
          >
            Create account
          </button>
        </form>

        <p className="text-sm mt-4 text-muted">
          Sudah punya akun?{" "}
          <a className="underline text-indigo-600 dark:text-indigo-300" href="/login">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
