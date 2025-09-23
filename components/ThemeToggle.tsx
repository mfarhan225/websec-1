// components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  const base =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2";
  const light =
    "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 focus:ring-neutral-400 shadow";
  const dark =
    "border-white/20 bg-white/10 text-white hover:bg-white/20 focus:ring-white/60";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className={`${base} ${isDark ? dark : light}`}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" className="fill-current">
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 14.32l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 12H1v0h3v0zm19 0h-3v0h3v0zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zM20.45 4.46l-1.41-1.41-1.79 1.8 1.4 1.4 1.8-1.79zM12 6a6 6 0 100 12 6 6 0 000-12z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" className="fill-current">
          <path d="M21.64 13A9 9 0 1111 2.36 7 7 0 0021.64 13z"/>
        </svg>
      )}
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
