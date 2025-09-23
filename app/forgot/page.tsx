// app/forgot/page.tsx
"use client";
import { useState } from "react";
import { withCsrfHeader } from "@/lib/csrf-client";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr(""); setDevToken(null);
    const res = await fetch(
      "/api/forgot",
      withCsrfHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    );
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message || "If that account exists, you'll receive reset instructions shortly.");
      if (data.devToken) setDevToken(data.devToken); // DEV only
    } else {
      setErr(data.error || "Request failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-md p-6">
        <h1 className="text-2xl font-semibold mb-4">Forgot Password</h1>
        {err && <p className="text-red-200 text-sm mb-3">{err}</p>}
        {msg && <p className="text-emerald-200 text-sm mb-3">{msg}</p>}
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-lg bg-white/90 text-black"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="w-full py-2 rounded-lg font-medium bg-black/80 text-white hover:bg-black">
            Send reset link
          </button>
        </form>

        {devToken && (
          <div className="mt-4 text-xs text-white/90 space-y-2">
            <p>DEV token (demo, bukan email):</p>
            <textarea readOnly className="w-full h-20 p-2 rounded bg-white/90 text-black">{devToken}</textarea>
            <a
              className="underline"
              href={`/reset?token=${encodeURIComponent(devToken)}`}
            >
              Buka halaman reset
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
