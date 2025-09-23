// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy (production-only)
const csp = [
  "default-src 'self'",
  // Next.js tidak butuh inline script di prod; hindari 'unsafe-inline'
  "script-src 'self'",
  // Tailwind/Next/font dapat injeksi <style>; izinkan inline style ringan
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const commonSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Tambahkan Permissions-Policy minimal
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodOnlyHeaders = [
  // HSTS aktif hanya di HTTPS/production
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    const base = [
      {
        // Header umum untuk semua path
        source: "/:path*",
        headers: isProd
          ? [...commonSecurityHeaders, ...prodOnlyHeaders]
          : [...commonSecurityHeaders],
      },
      {
        // Jangan cache halaman sensitif
        source: "/dashboard/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Jangan cache respons API
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
    return base;
  },
};

export default nextConfig;
