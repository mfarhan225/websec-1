// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { withCsrfHeader } from "@/lib/csrf-client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/documents", label: "Documents", icon: "📁" },
  { href: "/audit",     label: "Audit Log", icon: "🧾" },
  { href: "/settings",  label: "Settings",  icon: "⚙️" },
];

function NavLink({
  href, label, icon, active,
}: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        // radius lebih besar agar “pill”
        "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 dark:focus-visible:ring-white/50",
        active
          ? [
              // LIGHT → putih kontras + shadow halus + aksen kiri
              "bg-white border border-neutral-200 shadow-[0_2px_10px_rgba(0,0,0,0.06)] pl-2",
              "border-l-4 border-l-indigo-500",
              // DARK → kaca kontras
              "dark:bg-white/15 dark:border-white/20 dark:shadow-none",
            ].join(" ")
          : [
              "sidebar-text opacity-90 hover:bg-neutral-100",
              "dark:text-white/80 dark:hover:bg-white/10",
            ].join(" "),
      ].join(" ")}
    >
      {/* Icon */}
      <span
        aria-hidden
        className={
          active
            ? "nav-icon text-indigo-600 dark:text-indigo-200"
            : "nav-icon sidebar-muted dark:text-white/70"
        }
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className={
          active
            ? "nav-label font-medium text-indigo-900 dark:text-white"
            : "nav-label font-medium sidebar-text dark:text-white/80"
        }
      >
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const r = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    const res = await fetch("/api/logout", withCsrfHeader({ method: "POST" }));
    if (res.ok) r.push("/login");
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-4 py-4 text-lg font-semibold sidebar-text">
        <Link href="/dashboard">Credense</Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2">
        {NAV.map((n) => (
          <NavLink key={n.href} {...n} active={pathname?.startsWith(n.href) ?? false} />
        ))}
      </nav>

            {/* Footer actions */}
    <div className="mt-auto px-2 py-4 pb-28 md:pb-6">
        <button
            type="button"
            onClick={logout}
            className="
            w-full rounded-2xl border px-3 py-2 text-left text-sm font-medium transition-colors
            /* LIGHT: kontras & tidak nyaru */
            bg-neutral-50/95 !text-neutral-900 border-neutral-300 shadow-sm
            hover:bg-neutral-100 active:bg-neutral-200
            /* DARK: tetap kaca */
            dark:bg-white/10 dark:text-white dark:border-white/20 dark:hover:bg-white/20
            /* A11y */
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70
            dark:focus-visible:ring-white/50
            "
        >
            Logout
        </button>
        </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-panel sidebar hidden w-64 shrink-0 md:block">
        {content}
      </aside>

      {/* Mobile opener → kanan bawah */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-neutral-300 bg-white/80 px-4 py-2 text-sm text-neutral-800 shadow-md backdrop-blur md:hidden
                   dark:border-white/20 dark:bg-black/60 dark:text-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70
                   dark:focus-visible:ring-white/50"
        aria-label="Open navigation"
      >
        Menu
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-72 sidebar-panel sidebar p-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white/70 px-2 py-1 text-neutral-800 hover:bg-white
                           dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70
                           dark:focus-visible:ring-white/50"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
