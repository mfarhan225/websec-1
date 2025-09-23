// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <section className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/70 text-white shadow-2xl backdrop-blur-md p-6">
        <h1 className="m-0 text-2xl font-semibold">Credense</h1>
        <p className="mt-2 text-sm text-white/80">
          Secure B2B Client Document Portal.
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-black/80 px-4 py-2 font-medium text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white/20 px-4 py-2 font-medium text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            Register
          </Link>
        </div>
      </div>
    </section>
  );
}
