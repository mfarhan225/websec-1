// app/page.tsx
import AuthCard from "@/components/AuthCard";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative grid min-h-screen place-items-center p-6">
      {/* Theme toggle di pojok kanan atas (halaman publik tetap bisa ganti tema) */}
      <div className="pointer-events-auto absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Kartu Auth (Login/Register) */}
      <section aria-labelledby="auth-title" className="w-full">
        <h1 id="auth-title" className="sr-only">
          Credense — Secure B2B Client Document Portal
        </h1>
        <div className="mx-auto w-full max-w-md">
          <AuthCard />
        </div>
      </section>
    </main>
  );
}
