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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

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
  }

  return (
    <div className="min-h-[calc(100vh-80px)] grid place-items-center">
      <div className="surface w-full max-w-md p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <h1 className="text-2xl font-semibold text-primary mb-4">Credense — Login</h1>

        {err && (
          <p className="mb-3 text-sm text-red-600 dark:text-rose-300" aria-live="polite">
            {err}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              className="w-full rounded-xl px-3 py-2
                         border border-[var(--surface-border)] bg-[var(--surface-bg)]
                         text-primary placeholder:text-neutral-500 dark:placeholder:text-slate-300"
              placeholder="Email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <input
              className="w-full rounded-xl px-3 py-2
                         border border-[var(--surface-border)] bg-[var(--surface-bg)]
                         text-primary placeholder:text-neutral-500 dark:placeholder:text-slate-300"
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            className="w-full rounded-xl px-3 py-2 font-medium
                       bg-neutral-900 text-white hover:bg-black
                       dark:bg-white/20 dark:text-white dark:hover:bg-white/25"
          >
            Sign in
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
