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
const allOk = (c: ReturnType<typeof checks>) =>
  c.len && c.lower && c.upper && c.digit && c.symbol;

export default function Register() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const c = useMemo(() => checks(password), [password]);
  const valid = allOk(c);
  const passed = [c.len, c.lower, c.upper, c.digit, c.symbol].filter(Boolean).length;
  const strength = !password ? "" : passed <= 2 ? "Lemah" : passed === 3 ? "Cukup" : "Kuat";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!valid) { setErr("Password belum memenuhi semua kriteria."); return; }

    setLoading(true);
    try {
      const res = await fetch(
        "/api/register",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      );
      if (res.ok) { setMsg("Registered. Silakan login."); r.push("/login"); }
      else setErr((await res.json()).error || "Register failed");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2 text-sm " +
    "text-primary placeholder:text-neutral-500 dark:placeholder:text-slate-300 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-400/70 dark:focus:ring-white/50";

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="surface w-full max-w-md p-6 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
        <h1 className="mb-4 text-2xl font-semibold text-primary">Credense — Register</h1>

        {err && <p className="mb-3 text-sm text-red-600 dark:text-rose-300" aria-live="assertive">{err}</p>}
        {msg && <p className="mb-3 text-sm text-emerald-700 dark:text-emerald-300" aria-live="polite">{msg}</p>}

        <form onSubmit={submit} className="space-y-3" aria-busy={loading}>
          <input
            className={inputCls}
            placeholder="Email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className={inputCls}
            placeholder="Password (min 12, Aa1!)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby="pw-help"
          />

          {/* Checklist kriteria */}
          <div id="pw-help" className="surface p-3">
            <ul className="text-sm space-y-1">
              <li className={c.len   ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>{c.len   ? "✓" : "•"} Minimal 12 karakter</li>
              <li className={c.lower ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>{c.lower ? "✓" : "•"} Mengandung huruf kecil (a–z)</li>
              <li className={c.upper ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>{c.upper ? "✓" : "•"} Mengandung huruf besar (A–Z)</li>
              <li className={c.digit ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>{c.digit ? "✓" : "•"} Mengandung angka (0–9)</li>
              <li className={c.symbol? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}>{c.symbol? "✓" : "•"} Mengandung simbol (mis. ! @ # $ % …)</li>
              {password && <li className="pt-1 text-muted">Kekuatan: <span className="font-medium text-primary">{strength}</span></li>}
            </ul>
          </div>

          {/* Tombol kontras (sama seperti Login) */}
          <button
            type="submit"
            disabled={!valid || loading}
            className="btn-primary w-full disabled:opacity-100
                       disabled:bg-neutral-200 disabled:text-neutral-900 disabled:border-neutral-300
                       disabled:shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Sudah punya akun?{" "}
          <a className="underline text-primary" href="/login">Login</a>
        </p>
      </div>
    </div>
  );
}
