// components/TopBar.tsx
"use client";
import ThemeToggle from "@/components/ThemeToggle";
import { withCsrfHeader } from "@/lib/csrf-client";
import { useRouter } from "next/navigation";

export default function TopBar() {
  const r = useRouter();
  async function logout() {
    const res = await fetch("/api/logout", withCsrfHeader({ method: "POST" }));
    if (res.ok) r.push("/login");
  }
  return (
    <div className="fixed right-4 top-4 z-50 flex gap-2">
      <button
        onClick={logout}
        className="hidden md:inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                    border-neutral-300 bg-white text-neutral-800 shadow hover:bg-neutral-100
                    dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
        Logout
        </button>
      <ThemeToggle />
    </div>
  );
}
