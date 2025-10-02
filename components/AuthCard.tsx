// components/AuthCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { withCsrfHeader } from "@/lib/csrf-client";

/* =============== UI helpers =============== */
function EyeIcon({ open = false }: { open?: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-80">
      <path
        fill="currentColor"
        d="M2.1 3.51L3.51 2.1l18.39 18.39l-1.41 1.41l-2.5-2.5A11.41 11.41 0 0 1 12 20q-3.35 0-6.29-1.73T1 12q.74-1.43 1.85-2.62T5.7 7.15L2.1 3.51ZM12 7q3.35 0 6.29 1.73T23 12a12.7 12.7 0 0 1-2.58 3.48l-3.05-3.05q.11-.42.11-.82q0-2.07-1.47-3.53T12.48 6.54q-.4 0-.82.11L9.54 4.54A9.64 9.64 0 0 1 12 4Z"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-80">
      <path
        fill="currentColor"
        d="M12 5q3.35 0 6.29 1.73T23 12q-1.12 2.18-3.06 3.65T15 18.98A11.8 11.8 0 0 1 12 19q-3.35 0-6.29-1.73T1 12q1.12-2.18 3.06-3.65T9 5.02A11.8 11.8 0 0 1 12 5Zm0 2q-2.07 0-3.53 1.47T7 12t1.47 3.53T12 17t3.53-1.47T17 12t-1.47-3.53T12 7Zm0 2q1.25 0 2.12.88T15 12t-.88 2.12T12 15t-2.12-.88T9 12t.88-2.12T12 9Z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" fill="none" />
    </svg>
  );
}

/* =============== Password helpers =============== */
function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 16 && s > 0) s++;
  return Math.min(s, 4);
}

function generateStrongPassword(len = 16) {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const L = "abcdefghijkmnopqrstuvwxyz";
  const N = "23456789";
  const S = "!@#$%^&*()-_=+[]{}:;,.?";
  const ALL = U + L + N + S;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]!;
  const base = [pick(U), pick(L), pick(N), pick(S)];
  const rest = Array.from({ length: Math.max(0, len - base.length) }, () => pick(ALL));
  const chars = [...base, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/* =============== Input with icon & eye =============== */
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
  revealable?: boolean;
  onCapsChange?: (on: boolean) => void;
};

function Field({ id, label, icon, revealable, onCapsChange, ...rest }: InputProps) {
  const [reveal, setReveal] = useState(false);
  const [pressed, setPressed] = useState(false);
  const type = reveal || pressed ? "text" : rest.type || "text";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
        <input
          id={id}
          {...rest}
          type={type}
          onKeyUp={(e) => onCapsChange?.(e.getModifierState?.("CapsLock") ?? false)}
          className={[
            "w-full rounded-lg border bg-white/90 px-3 py-2 text-sm text-primary",
            icon ? "pl-9" : "",
            "border-[var(--surface-border)]",
            "focus:outline-none focus:ring-2 focus:ring-indigo-400/70",
            "dark:bg-white/10 dark:text-white",
          ].join(" ")}
        />
        {revealable && (
          <button
            type="button"
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-primary hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <EyeIcon open={reveal || pressed} />
          </button>
        )}
      </div>
    </div>
  );
}

/* =============== Main component =============== */
export default function AuthCard() {
  const [tab, setTab] = useState<"login" | "register">("login");

  // login state
  const [lemail, setLEmail] = useState("");
  const [lpw, setLPw] = useState("");
  const [capsLogin, setCapsLogin] = useState(false);
  const [busyLogin, setBusyLogin] = useState(false);
  const [msgLogin, setMsgLogin] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  // register state
  const [remail, setREmail] = useState("");
  const [rpw1, setRPw1] = useState("");
  const [rpw2, setRPw2] = useState("");
  const [capsReg, setCapsReg] = useState(false);
  const [busyReg, setBusyReg] = useState(false);
  const [msgReg, setMsgReg] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  // forgot mini
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fmail, setFmail] = useState("");
  const [busyForgot, setBusyForgot] = useState(false);
  const [msgForgot, setMsgForgot] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  const strength = useMemo(() => scorePassword(rpw1), [rpw1]);
  const match = rpw1.length > 0 && rpw1 === rpw2;

  useEffect(() => {
    setMsgLogin(null);
    setMsgReg(null);
  }, [tab]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busyLogin) return;
    setBusyLogin(true);
    setMsgLogin(null);
    try {
      const res = await fetch(
        "/api/login",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: lemail.trim().toLowerCase(), password: lpw }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsgLogin({ t: "ok", m: "Logged in. Redirecting…" });
        window.location.href = "/dashboard";
      } else {
        setMsgLogin({ t: "err", m: data?.error || "Login failed" });
      }
    } catch {
      setMsgLogin({ t: "err", m: "Network error" });
    } finally {
      setBusyLogin(false);
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (busyReg) return;
    setBusyReg(true);
    setMsgReg(null);
    try {
      const res = await fetch(
        "/api/register",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: remail.trim().toLowerCase(), password: rpw1 }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsgReg({ t: "ok", m: "Registered. Please login." });
        setTab("login");
        setLEmail(remail.trim().toLowerCase());
        setRPw1("");
        setRPw2("");
      } else {
        setMsgReg({ t: "err", m: data?.error || "Registration failed" });
      }
    } catch {
      setMsgReg({ t: "err", m: "Network error" });
    } finally {
      setBusyReg(false);
    }
  }

  async function doForgotClick() {
    if (busyForgot) return;
    setBusyForgot(true);
    setMsgForgot(null);
    try {
      const res = await fetch(
        "/api/forgot",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: fmail.trim().toLowerCase() }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsgForgot({ t: "ok", m: data?.message || "If that account exists, you'll receive an email shortly." });
      } else {
        setMsgForgot({ t: "err", m: data?.error || "Request failed" });
      }
    } catch {
      setMsgForgot({ t: "err", m: "Network error" });
    } finally {
      setBusyForgot(false);
    }
  }

  function putGenerated() {
    const gen = generateStrongPassword(18);
    setRPw1(gen);
    setRPw2(gen);
    navigator.clipboard?.writeText(gen).catch(() => {});
    setMsgReg({ t: "ok", m: "Strong password generated & copied." });
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
      {/* Header + logo */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-8 w-8">
          <Image src="/logo-light.png" alt="Credense logo" fill className="object-contain block dark:hidden" />
          <Image src="/logo-dark.png" alt="Credense logo" fill className="object-contain hidden dark:block" />
        </div>
        <div>
          <h1 className="m-0 text-lg font-semibold text-primary">Credense</h1>
          <p className="m-0 text-xs text-muted">Secure B2B Client Document Portal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4" role="tablist" aria-label="Auth tabs">
        <div className="grid grid-cols-2 rounded-xl border border-[var(--surface-border)] p-1 select-none">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            onClick={() => setTab("login")}
            className={[
              "appearance-none rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none",
              tab === "login"
                ? "bg-neutral-100 shadow-sm dark:bg-white/20"
                : "bg-transparent hover:bg-neutral-100 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <span className="auth-tab-label">Login</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            onClick={() => setTab("register")}
            className={[
              "appearance-none rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none",
              tab === "register"
                ? "bg-neutral-100 shadow-sm dark:bg-white/20"
                : "bg-transparent hover:bg-neutral-100 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <span className="auth-tab-label">Register</span>
          </button>
        </div>
      </div>

      {/* Forms */}
      {tab === "login" ? (
        <form onSubmit={doLogin} className="space-y-3" noValidate>
          <Field
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={lemail}
            onChange={(e) => setLEmail(e.target.value)}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 13L2 6.76V18h20V6.76L12 13Zm0-2L2 4h20l-10 7Z" /></svg>}
            required
          />
          <Field
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={lpw}
            onChange={(e) => setLPw(e.target.value)}
            revealable
            onCapsChange={setCapsLogin}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 1L3 6v6q0 6 9 11q9-5 9-11V6l-9-5Zm0 2.18L19 7v5q0 4.2-7 8.26Q5 16.2 5 12V7l7-3.82ZM11 9h2v4h-2V9Z" /></svg>}
            required
          />
          {capsLogin && <div className="text-xs text-amber-600 dark:text-amber-300">Caps Lock is ON</div>}
          {msgLogin && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg border px-3 py-2 text-sm ${
                msgLogin.t === "ok"
                  ? "border-emerald-300/60 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300"
                  : "border-red-300/60 text-red-700 dark:border-red-400/40 dark:text-red-300"
              }`}
            >
              {msgLogin.m}
            </div>
          )}
          <button disabled={busyLogin} className="btn-primary inline-flex items-center gap-2">
            {busyLogin && <Spinner />} Login
          </button>

          {/* Forgot mini */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setForgotOpen((v) => !v)}
              className="text-sm text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              {forgotOpen ? "Hide forgot password" : "Forgot password?"}
            </button>
            {forgotOpen && (
              <div role="group" aria-label="Forgot password" className="mt-2 space-y-2 rounded-lg border border-[var(--surface-border)] p-3">
                <Field
                  id="forgot-email"
                  label="Your email"
                  type="email"
                  autoComplete="email"
                  value={fmail}
                  onChange={(e) => setFmail(e.target.value)}
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 13L2 6.76V18h20V6.76L12 13Zm0-2L2 4h20l-10 7Z" /></svg>}
                  required
                />
                {msgForgot && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      msgForgot.t === "ok"
                        ? "border-emerald-300/60 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300"
                        : "border-red-300/60 text-red-700 dark:border-red-400/40 dark:text-red-300"
                    }`}
                  >
                    {msgForgot.m}
                  </div>
                )}
                <button
                  type="button"
                  onClick={doForgotClick}
                  disabled={busyForgot}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10 disabled:opacity-60"
                >
                  {busyForgot && <Spinner />} Send reset link
                </button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={doRegister} className="space-y-3" noValidate>
          <Field
            id="reg-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={remail}
            onChange={(e) => setREmail(e.target.value)}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 13L2 6.76V18h20V6.76L12 13Zm0-2L2 4h20l-10 7Z" /></svg>}
            required
          />

          <Field
            id="reg-pw1"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={rpw1}
            onChange={(e) => setRPw1(e.target.value)}
            onCapsChange={setCapsReg}
            revealable
            icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 1L3 6v6q0 6 9 11q9-5 9-11V6l-9-5Zm0 2.18L19 7v5q0 4.2-7 8.26Q5 16.2 5 12V7l7-3.82ZM11 9h2v4h-2V9Z" /></svg>}
            required
          />

          {/* Strength meter */}
          <div className="space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={["h-1 w-full rounded", i < strength ? "bg-emerald-500" : "bg-neutral-300 dark:bg-white/20"].join(" ")}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-1 text-xs">
              <li className={rpw1.length >= 12 ? "text-emerald-600 dark:text-emerald-300" : "text-muted"}>≥ 12 characters</li>
              <li className={/[A-Z]/.test(rpw1) ? "text-emerald-600 dark:text-emerald-300" : "text-muted"}>Uppercase</li>
              <li className={/[a-z]/.test(rpw1) ? "text-emerald-600 dark:text-emerald-300" : "text-muted"}>Lowercase</li>
              <li className={/[0-9]/.test(rpw1) ? "text-emerald-600 dark:text-emerald-300" : "text-muted"}>Number</li>
              <li className={/[^A-Za-z0-9]/.test(rpw1) ? "text-emerald-600 dark:text-emerald-300" : "text-muted"}>Symbol</li>
            </ul>
          </div>

          <Field
            id="reg-pw2"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={rpw2}
            onChange={(e) => setRPw2(e.target.value)}
            revealable
            icon={<svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="M12 1L3 6v6q0 6 9 11q9-5 9-11V6l-9-5Zm0 2.18L19 7v5q0 4.2-7 8.26Q5 16.2 5 12V7l7-3.82ZM11 9h2v4h-2V9Z" /></svg>}
            required
          />

          {capsReg && <div className="text-xs text-amber-600 dark:text-amber-300">Caps Lock is ON</div>}
          {!match && rpw2.length > 0 && <div className="text-xs text-red-600 dark:text-red-300">Passwords do not match</div>}

          {msgReg && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg border px-3 py-2 text-sm ${
                msgReg.t === "ok"
                  ? "border-emerald-300/60 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300"
                  : "border-red-300/60 text-red-700 dark:border-red-400/40 dark:text-red-300"
              }`}
            >
              {msgReg.m}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={putGenerated}
              className="rounded-lg border px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Generate strong password
            </button>
            <div className="ml-auto" />
            <button disabled={busyReg || !match} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {busyReg && <Spinner />} Create account
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
