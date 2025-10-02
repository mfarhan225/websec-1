// components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SidebarStorage from "@/components/SidebarStorage";
import SidebarActivity from "@/components/SidebarActivity";

/* -----------------------------
   Config menu
------------------------------ */
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
};

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <span aria-hidden>📊</span> },
      { href: "/documents", label: "Documents", icon: <span aria-hidden>📁</span> },
    ],
  },
  {
    title: "Governance",
    items: [{ href: "/audit", label: "Audit Log", icon: <span aria-hidden>🧾</span>, badge: 3 }],
  },
  {
    title: "Settings",
    items: [{ href: "/settings", label: "Settings", icon: <span aria-hidden>⚙️</span> }],
  },
];

/* -----------------------------
   Public routes (hide sidebar)
------------------------------ */
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot", "/reset"];
function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

/* -----------------------------
   Nav item
------------------------------ */
function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center rounded-xl px-3 py-2 text-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 dark:focus-visible:ring-white/50",
        active
          ? [
              // LIGHT: pill ungu lembut agar kontras
              "bg-indigo-50/80 border border-indigo-200/80",
              "shadow-[0_6px_18px_rgba(79,70,229,.08)]",
              "pl-2 border-l-4 border-l-indigo-500",
              // DARK: kaca halus
              "dark:bg-white/15 dark:border-white/20 dark:shadow-none",
            ].join(" ")
          : ["sidebar-text/90 hover:bg-neutral-100", "dark:text-white/80 dark:hover:bg-white/10"].join(" "),
      ].join(" ")}
    >
      {/* Icon */}
      <span
        className={
          "nav-icon " +
          (active ? "mr-3 text-indigo-600 dark:text-indigo-200" : "mr-3 sidebar-muted dark:text-white/70")
        }
      >
        {item.icon}
      </span>

      {/* Label + badge */}
      {!collapsed && (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={
              "nav-label " +
              (active ? "font-medium text-slate-900 dark:text-white" : "font-medium sidebar-text dark:text-white/80")
            }
          >
            {item.label}
          </span>
          {item.badge != null && (
            <span className="ml-auto rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 dark:border-white/20 dark:text-white/80">
              {item.badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

/* -----------------------------
   Sidebar
------------------------------ */
export default function Sidebar() {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  // collapse state (persist)
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sidebar:collapsed");
      if (raw != null) setCollapsed(raw === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // === NEW: sinkronkan CSS var --sidebar-w agar area konten ikut adjust ===
  useEffect(() => {
    const width = collapsed ? "5rem" : "16rem"; // w-20 / w-64
    document.documentElement.style.setProperty("--sidebar-w", width);
  }, [collapsed]);
  useEffect(() => {
    // set default kalau belum ada (mis. first load)
    if (!document.documentElement.style.getPropertyValue("--sidebar-w")) {
      document.documentElement.style.setProperty("--sidebar-w", "16rem");
    }
  }, []);
  // =======================================================================

  if (isPublicPath(pathname)) return null;

  const desktopWidth = useMemo(() => (collapsed ? "w-20" : "w-64"), [collapsed]);

  /* Brand */
  const Brand = (
    <>
      {/* Expanded brand – fixed size, jelas di light */}
      <Link
        href="/dashboard"
        aria-label="Credense home"
        className={`${collapsed ? "hidden" : "inline-flex"} h-14 items-center`}
      >
        <Image src="/logo-light.png" alt="Credense" width={220} height={44} priority className="block dark:hidden" />
        <Image src="/logo-dark.png" alt="Credense" width={220} height={44} priority className="hidden dark:block" />
      </Link>

      {/* Collapsed brand: favicon 44x44 */}
      <Link
        href="/dashboard"
        aria-label="Credense home"
        className={`${collapsed ? "inline-flex" : "hidden"} size-11 items-center justify-center`}
      >
        <img src="/icon.ico" alt="Credense" className="h-7 w-7 object-contain" width={28} height={28} />
      </Link>
    </>
  );

  /* Toggle */
  const ToggleBtn = (
    <button
      type="button"
      onClick={() => setCollapsed((v) => !v)}
      className="sidebar-ctrl size-11"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand" : "Collapse"}
    >
      <span aria-hidden className="text-lg leading-none">
        {collapsed ? "»" : "«"}
      </span>
    </button>
  );

  /* Content */
  const list = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-transparent">
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          {Brand}
          {ToggleBtn}
        </div>
        <div className="mx-3 mb-2 h-px bg-white/[.08] dark:bg-white/10" />
      </div>

      {/* Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 pb-4">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            {!collapsed && <div className="sidebar-section px-2 pb-2">{sec.title}</div>}
            <div className="space-y-2">
              {sec.items.map((it) => (
                <NavLink key={it.href} item={it} active={pathname.startsWith(it.href)} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer widgets */}
      <div className="sticky bottom-0 space-y-3 px-3 pb-4">
        <SidebarStorage collapsed={collapsed} />
        <SidebarActivity collapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`sidebar-panel sidebar fixed inset-y-0 left-0 z-30 hidden overflow-hidden ${desktopWidth} md:block transition-[width] duration-200`}
        aria-label="Main navigation"
      >
        {list}
      </aside>

      {/* (Tidak perlu spacer lagi; padding konten diatur via .app-shell + --sidebar-w) */}

      {/* Mobile (expanded) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-neutral-300 bg-white/80 px-4 py-2 text-sm text-neutral-800 shadow-md backdrop-blur md:hidden
                   dark:border-white/20 dark:bg-black/60 dark:text-white
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 dark:focus-visible:ring-white/50"
        aria-label="Open navigation"
      >
        Menu
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-72 sidebar-panel sidebar overflow-hidden p-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white/70 px-2 py-1 text-neutral-800 hover:bg-white
                           dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 dark:focus-visible:ring-white/50"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>
            {list}
          </div>
        </div>
      )}
    </>
  );
}
