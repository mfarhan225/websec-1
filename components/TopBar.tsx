// components/TopBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { withCsrfHeader } from "@/lib/csrf-client";

type Props = {
  /** Jika di-provide:
   *  - true  => user sudah login, tampilkan menu akun
   *  - false => user belum login, sembunyikan menu akun
   *  Jika tidak di-provide, TopBar akan mendeteksi dari pathname (rute publik). */
  authed?: boolean;
};

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot", "/reset"];
function isPublicPath(pathname: string) {
  if (pathname === "/") return true; // landing root
  // publik bila sama persis atau child dari prefix (dengan segment)
  return PUBLIC_PREFIXES.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/") ||
      pathname.startsWith(p + "?")
  );
}

export default function TopBar({ authed }: Props) {
  const r = useRouter();
  const pathname = (usePathname() || "/").split("#")[0]; // singkirkan hash

  // Jika prop authed diberikan, override deteksi; jika tidak, deteksi via path
  const isPublic = authed === undefined ? isPublicPath(pathname) : !authed;

  const [busy, setBusy] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Tutup menu saat klik di luar
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!openMenu) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  // Tutup menu dengan ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Tutup menu saat pindah halaman
  useEffect(() => {
    setOpenMenu(false);
  }, [pathname]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/logout", withCsrfHeader({ method: "POST" }));
      if (res.ok) r.replace("/login");
      else alert("Logout failed. Please try again.");
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logoutAll() {
    if (busyAll) return;
    const ok = window.confirm("Logout dari SEMUA perangkat/sesi?");
    if (!ok) return;

    setBusyAll(true);
    try {
      const res = await fetch("/api/me/logout-all", withCsrfHeader({ method: "POST" }));
      if (res.ok) r.replace("/login");
      else alert("Logout all failed. Please try again.");
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusyAll(false);
      setOpenMenu(false);
    }
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      {isPublic ? (
        // Halaman publik: hanya ThemeToggle
        <ThemeToggle />
      ) : (
        <>
          {/* Dropdown akun (Logout) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu}
              onClick={() => setOpenMenu((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                         border-neutral-300 bg-white text-neutral-800 shadow hover:bg-neutral-100
                         dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              Account <span aria-hidden>▾</span>
            </button>

            {openMenu && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--surface-border)]
                           bg-[var(--surface-bg)] p-2 text-sm text-primary shadow-lg"
              >
                <button
                  role="menuitem"
                  onClick={logout}
                  disabled={busy}
                  className="w-full rounded-md px-3 py-2 text-left hover:bg-neutral-50 disabled:opacity-60
                             dark:hover:bg-white/10"
                >
                  {busy ? "Logging out…" : "Logout"}
                </button>
                <button
                  role="menuitem"
                  onClick={logoutAll}
                  disabled={busyAll}
                  className="w-full rounded-md px-3 py-2 text-left hover:bg-neutral-50 disabled:opacity-60
                             dark:hover:bg-white/10"
                >
                  {busyAll ? "Revoking…" : "Logout all sessions"}
                </button>
              </div>
            )}
          </div>

          {/* Theme switch selalu ada */}
          <ThemeToggle />
        </>
      )}
    </div>
  );
}
