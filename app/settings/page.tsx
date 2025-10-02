// app/settings/page.tsx
"use client";

import { useState } from "react";
import { withCsrfHeader } from "@/lib/csrf-client";
import { useRouter } from "next/navigation";

type SessionRow = {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  current?: boolean;
};

// --- demo sessions (in-memory) ---
const DEMO_SESSIONS: SessionRow[] = [
  { id: "cur", device: "Chrome · Windows",   ip: "203.0.113.5",  lastActive: "Just now",   current: true },
  { id: "m1",  device: "Safari · iPhone",    ip: "198.51.100.12",lastActive: "2 days ago" },
  { id: "m2",  device: "Edge · Workstation", ip: "203.0.113.17", lastActive: "1 week ago" },
];

export default function Settings() {
  const router = useRouter();

  // Security toggles (demo only)
  const [require2FA, setRequire2FA] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Change password state
  const [oldPw, setOldPw] = useState("");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const strong =
    /[a-z]/.test(newPw1) &&
    /[A-Z]/.test(newPw1) &&
    /[0-9]/.test(newPw1) &&
    /[^A-Za-z0-9]/.test(newPw1) &&
    newPw1.length >= 12;
  const match = newPw1.length > 0 && newPw1 === newPw2;

  function info(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!strong || !match || oldPw.length === 0) return;

    try {
      const res = await fetch(
        "/api/change-password",
        withCsrfHeader({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw1 }),
        })
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        info("Password updated. Please login again…");
        setOldPw(""); setNewPw1(""); setNewPw2("");
        setTimeout(() => router.push("/login"), 600);
      } else {
        info(data?.error || "Failed to update password");
      }
    } catch {
      info("Network error");
    }
  }

  async function logoutAllSessions() {
    try {
      const res = await fetch(
        "/api/me/logout-all",
        withCsrfHeader({ method: "POST", headers: { "Content-Type": "application/json" } })
      );
      if (res.ok) {
        info("All sessions revoked. Redirecting to login…");
        setTimeout(() => router.push("/login"), 500);
      } else {
        const data = await res.json().catch(() => ({}));
        info(data?.error || "Failed to revoke sessions");
      }
    } catch {
      info("Network error");
    }
  }

  const [sessions, setSessions] = useState<SessionRow[]>(DEMO_SESSIONS);
  function revoke(id: string) {
    setSessions((rows) =>
      rows.filter((r) => r.id !== id || r.current) // jangan hapus current
    );
    info(id === "cur" ? "Cannot revoke current session." : "Session revoked (demo).");
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Settings</h1>
        <p className="text-muted">Preferensi akun & keamanan.</p>
      </div>

      {notice && (
        <div className="surface p-3 text-sm text-primary shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          {notice}
        </div>
      )}

      {/* Grid 2 kolom */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Account (tema toggle DIHAPUS) */}
        <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-medium text-primary">Account</h2>
          <p className="text-sm text-muted">Informasi akun & verifikasi email.</p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Email</span>
              <span className="font-medium text-primary">you@client.com</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Status</span>
              <span className={emailVerified ? "text-emerald-600" : "text-amber-600"}>
                {emailVerified ? "Verified" : "Unverified"}
              </span>
            </div>
            <button
              onClick={() => { setEmailVerified(true); info("Verification email sent (demo)."); }}
              className="mt-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              {emailVerified ? "Resend verification" : "Send verification email"}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-medium text-primary">Security</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">
            <li>CSRF protection (double-submit) aktif</li>
            <li>Session HS512, httpOnly, SameSite=strict</li>
            <li>Rate limit login/register/forgot</li>
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--surface-border)] p-3">
            <div>
              <div className="text-sm font-medium text-primary">Require 2FA (demo)</div>
              <div className="text-sm text-muted">Aktifkan TOTP saat login.</div>
            </div>
            <button
              onClick={() => { setRequire2FA((v) => !v); info(`2FA ${!require2FA ? "enabled" : "disabled"} (demo).`); }}
              className={[
                "h-8 w-14 rounded-full transition-colors",
                require2FA ? "bg-indigo-600" : "bg-neutral-300 dark:bg-white/20",
              ].join(" ")}
              aria-pressed={require2FA}
            >
              <span
                className={[
                  "block h-7 w-7 translate-x-1 rounded-full bg-white transition-transform",
                  require2FA ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="mt-4 rounded-xl border border-[var(--surface-border)] p-3">
            <div className="text-sm font-medium text-primary">Change Password</div>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <input
                type="password"
                placeholder="Current password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                className="rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                           dark:bg-white/10 dark:text-white"
                required
                autoComplete="current-password"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPw1}
                onChange={(e) => setNewPw1(e.target.value)}
                className="rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                           dark:bg-white/10 dark:text-white"
                required
                autoComplete="new-password"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                className="rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                           dark:bg-white/10 dark:text-white"
                required
                autoComplete="new-password"
              />
            </div>
            <ul className="mt-2 text-xs text-muted">
              <li className={newPw1.length >= 12 ? "text-emerald-600" : ""}>≥ 12 karakter</li>
              <li className={/[A-Z]/.test(newPw1) ? "text-emerald-600" : ""}>Ada huruf besar</li>
              <li className={/[a-z]/.test(newPw1) ? "text-emerald-600" : ""}>Ada huruf kecil</li>
              <li className={/[0-9]/.test(newPw1) ? "text-emerald-600" : ""}>Ada angka</li>
              <li className={/[^A-Za-z0-9]/.test(newPw1) ? "text-emerald-600" : ""}>Ada simbol</li>
              <li className={match ? "text-emerald-600" : ""}>Konfirmasi cocok</li>
            </ul>
            <button
              disabled={!strong || !match || !oldPw}
              className="mt-3 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 disabled:opacity-50
                         dark:hover:bg-white/10"
            >
              Update password
            </button>
          </form>
        </div>
      </div>

      {/* Sessions + Danger zone */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-medium text-primary">Active Sessions (demo)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2">Device</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">Last Active</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--surface-border)]">
                    <td className="py-2 text-primary">
                      {s.device}{" "}
                      {s.current && (
                        <span className="ml-2 rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs">
                          current
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-primary">{s.ip}</td>
                    <td className="py-2 text-primary">{s.lastActive}</td>
                    <td className="py-2 text-right">
                      <button
                        disabled={s.current}
                        onClick={() => revoke(s.id)}
                        className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 disabled:opacity-50
                                   dark:hover:bg-white/10"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">No other active sessions.</p>
            )}
          </div>
        </div>

        <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-medium text-primary">Danger Zone</h2>
          <p className="text-sm text-muted">Aksi sensitif.</p>
          <button
            onClick={logoutAllSessions}
            className="mt-3 w-full rounded-lg border border-amber-300/70 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50
                       dark:border-amber-400/50 dark:text-amber-300 dark:hover:bg-amber-400/10"
          >
            Logout all sessions
          </button>
          <button
            disabled
            className="mt-3 w-full rounded-lg border border-red-300/60 px-3 py-2 text-sm text-red-600 opacity-70
                       dark:border-red-400/40 dark:text-red-300"
          >
            Delete account
          </button>
        </div>
      </div>
    </section>
  );
}
