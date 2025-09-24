// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withCsrfHeader } from "@/lib/csrf-client";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(
        "/api/login",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      );
      if (res.ok) r.push("/dashboard");
      else setErr((await res.json()).error || "Login failed");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] grid place-items-center">
      <div className="surface w-full max-w-md p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <h1 className="mb-4 text-2xl font-semibold text-primary">Credense — Login</h1>

        {err && (
          <p className="mb-3 text-sm text-red-600 dark:text-rose-300" aria-live="polite">
            {err}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3" aria-busy={loading}>
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2
                         text-primary placeholder:text-neutral-500 dark:placeholder:text-slate-300"
              placeholder="Email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <input
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2
                         text-primary placeholder:text-neutral-500 dark:placeholder:text-slate-300"
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {/* Tombol kontras di light + kaca di dark (dari globals.css) */}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 space-y-1 text-sm">
          <p className="text-muted">
            Belum punya akun?{" "}
            <a className="underline text-primary" href="/register">
              Register
            </a>
          </p>
          <p className="text-muted">
            Lupa password?{" "}
            <a className="underline text-primary" href="/forgot">
              Reset
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
