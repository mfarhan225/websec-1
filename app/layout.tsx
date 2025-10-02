// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import ThemeProvider from "@/components/ThemeProvider";
import ClientChrome from "@/components/ClientChrome";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Credense",
  description: "Secure B2B Client Document Portal",
  icons: {
    icon: "/icon.ico",       // ← file di public/icon.ico
    shortcut: "/icon.ico",   // (opsional) untuk beberapa browser
    apple: "/icon.ico",      // (opsional) fallback sederhana
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen bg-app">
            <ClientChrome>{children}</ClientChrome>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
