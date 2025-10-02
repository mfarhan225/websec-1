// next.config.mjs
import path from "path";
import { fileURLToPath } from "url";

/** ESM __dirname */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

// --- Content Security Policy (prod only) ---
// NOTE: kamu pakai 'unsafe-inline' agar kompatibel hydrasi; ZAP mungkin warning.
// Kalau nanti mau lebih ketat, kita bisa pindah ke nonce-based CSP.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodOnlyHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // ⬅️ hilangkan "X-Powered-By: Next.js"

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: { unoptimized: true },

  // Alias '@' → root project
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },

  // ⬇️ Tambahkan rewrite agar /security.txt → /.well-known/security.txt
  async rewrites() {
    return [
      { source: "/security.txt", destination: "/.well-known/security.txt" },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: isProd
          ? [...commonSecurityHeaders, ...prodOnlyHeaders]
          : [...commonSecurityHeaders],
      },

      // Cache-control untuk halaman aplikasi
      { source: "/dashboard/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },

      // ⬇️ Header opsional untuk security.txt (biar bisa di-cache 1 hari)
      {
        source: "/.well-known/security.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, must-revalidate" }],
      },
      {
        source: "/security.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
