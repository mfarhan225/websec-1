// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { withCsrfHeader } from "@/lib/csrf-client";

// ===== Dummy data (in-memory) =====
type Doc = {
  id: string;
  name: string;
  owner: string;
  updatedAt: string;
  sizeKB: number;
  tag: "Legal" | "Finance" | "Tech";
};
const ALL_DOCS: Doc[] = [
  { id: "1", name: "MSA_Acorn_Corp_v3.pdf", owner: "you@client.com",     updatedAt: "2025-09-10 14:03", sizeKB: 842,  tag: "Legal"   },
  { id: "2", name: "Q3_Financials.xlsx",     owner: "finance@client.com", updatedAt: "2025-09-08 09:21", sizeKB: 1204, tag: "Finance" },
  { id: "3", name: "Infra_Architecture.png", owner: "cto@client.com",     updatedAt: "2025-09-05 19:45", sizeKB: 356,  tag: "Tech"    },
];

type Activity = { t: string; who: string; act: "VIEW" | "SHARE" | "UPLOAD" | "DELETE"; target: string };
const ACTIVITIES: Activity[] = [
  { t: "2025-09-12 10:22", who: "you@client.com",  act: "VIEW",   target: "MSA_Acorn_Corp_v3.pdf" },
  { t: "2025-09-12 10:18", who: "pm@client.com",   act: "SHARE",  target: "Q3_Financials.xlsx"     },
  { t: "2025-09-11 17:02", who: "legal@client.com",act: "UPLOAD", target: "NDA-Redline.docx"       },
];

// ===== Small UI helpers =====
function TagBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs text-primary">
      {children}
    </span>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-lg bg-[var(--surface-bg)] " + className
      }
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)]" />
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }`}</style>
      <div className="h-full w-full opacity-0">.</div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  // normalize to 0..1
  const max = Math.max(...points);
  const min = Math.min(...points);
  const norm = points.map((p) => (max === min ? 0.5 : (p - min) / (max - min)));

  const path = norm
    .map((v, i) => {
      const x = (i / (norm.length - 1)) * 100;
      const y = 100 - v * 100;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-24 opacity-80">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="6" className="text-indigo-400 dark:text-indigo-300" />
      <path d={`${path} L100,100 L0,100 Z`} className="fill-indigo-400/10 dark:fill-indigo-300/10" />
    </svg>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2300);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2 text-sm text-primary shadow"
    >
      {msg}
    </div>
  );
}

// ===== Share Modal (dummy) =====
function ShareModal({
  doc,
  onClose,
  onCreate,
}: {
  doc: Doc | null;
  onClose: () => void;
  onCreate: (opts: { expiryDays: number; allowDownload: boolean; password?: string }) => void;
}) {
  const [expiry, setExpiry] = useState(7);
  const [allowDl, setAllowDl] = useState(true);
  const [pw, setPw] = useState("");

  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create share link"
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] p-5 text-primary shadow-xl"
      >
        <h3 className="text-lg font-semibold">Share “{doc.name}”</h3>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-muted">Expiry (days)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={expiry}
              onChange={(e) => setExpiry(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowDl}
              onChange={(e) => setAllowDl(e.target.checked)}
            />
            <span className="text-primary">Allow download</span>
          </label>

          <label className="block">
            <span className="text-muted">Password (optional)</span>
            <input
              type="text"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2"
              placeholder="••••••"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onCreate({ expiryDays: expiry, allowDownload: allowDl, password: pw || undefined })
            }
            className="rounded-lg border border-[var(--surface-border)] bg-black/80 px-3 py-1.5 text-sm text-white hover:bg-black dark:bg-white/20 dark:text-white"
          >
            Create link
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Page =====
export default function Dashboard() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<Doc["tag"] | "All">("All");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);

  useEffect(() => {
    // demo shimmer singkat
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const docs = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return ALL_DOCS.filter((d) => {
      const okTag = tag === "All" || d.tag === tag;
      const okQ =
        !qx ||
        d.name.toLowerCase().includes(qx) ||
        d.owner.toLowerCase().includes(qx);
      return okTag && okQ;
    });
  }, [q, tag]);

  function notReady(msg: string) {
    setToast(`${msg} — demo only`);
  }

  function onCreateShare(_opts: { expiryDays: number; allowDownload: boolean; password?: string }) {
    setShareDoc(null);
    setToast("Share link created (demo)");
    // NOTE: produksi → POST ke /api/shares dengan CSRF header
    // fetch("/api/shares", withCsrfHeader({ method: "POST", body: JSON.stringify({...}) }))
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
        <p className="text-muted">Ringkasan dokumen & aktivitas terbaru.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <Shimmer className="h-28" />
            <Shimmer className="h-28" />
            <Shimmer className="h-28" />
          </>
        ) : (
          [
            { label: "Total Documents", value: 128, sub: "+8 this week", series: [20, 22, 25, 26, 27, 30, 32, 33] },
            { label: "Shared Externally", value: 26, sub: "12 active links", series: [3, 4, 8, 10, 12, 14, 18, 26] },
            { label: "Pending Reviews", value: 5, sub: "2 due today", series: [9, 6, 7, 6, 5, 5, 4, 5] },
          ].map((c) => (
            <div key={c.label} className="surface flex items-center justify-between p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <div>
                <div className="text-sm text-muted">{c.label}</div>
                <div className="mt-1 text-2xl font-semibold text-primary">{c.value}</div>
                <div className="mt-1 text-xs text-muted">{c.sub}</div>
              </div>
              <Sparkline points={c.series} />
            </div>
          ))
        )}
      </div>

      {/* TOOLBAR + FILTER */}
      <div className="surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => notReady("Upload")}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Upload
            </button>
            <button
              onClick={() => notReady("New Folder")}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              New Folder
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name/owner…"
              className="w-full max-w-xs rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Search recent documents"
            />
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Filter by tag"
            >
              <option>All</option>
              <option>Legal</option>
              <option>Finance</option>
              <option>Tech</option>
            </select>
          </div>
        </div>
      </div>

      {/* RECENT DOCS + ACTIVITY */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Documents */}
        <div className="md:col-span-2 surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="mb-3 text-base font-medium text-primary">Recent Documents</h2>

          {loading ? (
            <div className="space-y-3">
              <Shimmer className="h-12" />
              <Shimmer className="h-12" />
              <Shimmer className="h-12" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Owner</th>
                    <th className="py-2">Updated</th>
                    <th className="py-2">Size</th>
                    <th className="py-2">Tag</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-t border-[var(--surface-border)] hover:bg-neutral-50/50 dark:hover:bg-white/5">
                      <td className="py-2 text-primary">{d.name}</td>
                      <td className="py-2 text-primary">{d.owner}</td>
                      <td className="py-2 text-primary">{d.updatedAt}</td>
                      <td className="py-2 text-primary">{d.sizeKB} KB</td>
                      <td className="py-2">
                        <TagBadge>{d.tag}</TagBadge>
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setShareDoc(d)}
                            className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
                          >
                            Share
                          </button>
                          <button
                            onClick={() => notReady("Download")}
                            className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary opacity-80 hover:bg-neutral-50 dark:hover:bg-white/10"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-2 text-xs text-muted">
                *Demo: aksi belum terhubung storage/presigned URL.
              </p>
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium text-primary">Activity</h2>
            <button
              onClick={() => notReady("Export CSV")}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Shimmer className="h-16" />
              <Shimmer className="h-16" />
              <Shimmer className="h-16" />
            </div>
          ) : (
            <ol className="relative ml-4 space-y-4 before:absolute before:left-[-1rem] before:top-1 before:h-full before:w-px before:bg-[var(--surface-border)]">
              {ACTIVITIES.map((a, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute left-[-1.3rem] top-1 inline-flex h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        a.act === "VIEW"
                          ? "var(--surface-border)"
                          : a.act === "SHARE"
                          ? "rgba(99,102,241,.7)"
                          : a.act === "UPLOAD"
                          ? "rgba(34,197,94,.8)"
                          : "rgba(239,68,68,.8)",
                    }}
                    aria-hidden="true"
                  />
                  <div className="rounded-lg border border-[var(--surface-border)] p-3 text-sm">
                    <div className="text-muted">{a.t}</div>
                    <div className="text-primary">
                      <span className="font-medium">{a.who}</span> — {a.act}{" "}
                      <span className="font-mono">{a.target}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-2 text-xs text-muted">*Demo: data in-memory.</p>
        </div>
      </div>

      {/* Share modal */}
      <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} onCreate={onCreateShare} />
    </section>
  );
}
