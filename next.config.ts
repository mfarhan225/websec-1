// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// --- Content Security Policy (prod only) ---
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  // Tailwind/Next inject some inline <style>, keep this allowed
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
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodOnlyHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Netlify tip: don’t let TypeScript/ESLint fail the build.
   * (You still get editor/CI warnings, but Netlify build continues.)
   */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  /**
   * If you’re not using next/image or remote loaders, this avoids image optimisation
   * at build time and is often simpler on Netlify’s runtime.
   */
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: isProd
          ? [...commonSecurityHeaders, ...prodOnlyHeaders]
          : [...commonSecurityHeaders],
      },
      { source: "/dashboard/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
