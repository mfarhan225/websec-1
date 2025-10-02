// components/ClientChrome.tsx
"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

type Props = { children: React.ReactNode };

// Rute publik (tanpa chrome aplikasi)
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot", "/reset"];
function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/") ||
      pathname.startsWith(p + "?")
  );
}

export default function ClientChrome({ children }: Props) {
  const pathname = usePathname() || "/";

  // Halaman publik → tanpa sidebar, TopBar otomatis hanya tombol tema
  if (isPublicPath(pathname)) {
    return <main className="min-h-screen p-4 md:p-8">{children}</main>;
  }

  // Halaman aplikasi → Sidebar fixed; padding kiri main mengikuti --sidebar-w
  return (
    <div className="min-h-screen">
      <TopBar />
      <Sidebar />
      <main className="app-shell min-h-screen p-4 md:p-8">{children}</main>
    </div>
  );
}
