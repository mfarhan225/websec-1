// app/documents/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withCsrfHeader } from "@/lib/csrf-client";

/* -------------------------------------------
   Types & dummy data
------------------------------------------- */
type Tag = "Legal" | "Finance" | "Tech" | "HR";
type Doc = {
  id: string;
  name: string;
  owner: string;
  updatedAt: string; // ISO-ish (YYYY-MM-DD HH:mm)
  sizeKB: number;
  tag: Tag;
  type: "pdf" | "word" | "excel" | "image" | "txt";
};

const START_DOCS: Doc[] = [
  { id: "1", name: "MSA_Acorn_Corp_v3.pdf", owner: "you@client.com",     updatedAt: "2025-09-10 14:03", sizeKB: 842,  tag: "Legal",   type: "pdf"  },
  { id: "2", name: "Q3_Financials.xlsx",     owner: "finance@client.com", updatedAt: "2025-09-08 09:21", sizeKB: 1204, tag: "Finance", type: "excel" },
  { id: "3", name: "Infra_Architecture.png", owner: "cto@client.com",     updatedAt: "2025-09-05 19:45", sizeKB: 356,  tag: "Tech",    type: "image" },
  { id: "4", name: "Onboarding_Guide.docx",  owner: "hr@client.com",      updatedAt: "2025-09-03 12:11", sizeKB: 221,  tag: "HR",      type: "word"  },
  { id: "5", name: "Vendor_List.txt",        owner: "ops@client.com",     updatedAt: "2025-09-02 08:55", sizeKB: 18,   tag: "Tech",    type: "txt"   },
  { id: "6", name: "NDA_Template_v2.docx",   owner: "legal@client.com",   updatedAt: "2025-08-31 17:42", sizeKB: 96,   tag: "Legal",   type: "word"  },
  { id: "7", name: "Roadmap_Q4.png",         owner: "pm@client.com",      updatedAt: "2025-08-30 14:02", sizeKB: 512,  tag: "Tech",    type: "image" },
  { id: "8", name: "Payroll_Sep.xlsx",       owner: "hr@client.com",      updatedAt: "2025-08-29 09:10", sizeKB: 734,  tag: "HR",      type: "excel" },
];

/* -------------------------------------------
   Small UI helpers: Shimmer, Toast, TagBadge
------------------------------------------- */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={"relative overflow-hidden rounded-lg bg-[var(--surface-bg)] " + className}>
      <div className="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)]" />
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="h-full w-full opacity-0">.</div>
    </div>
  );
}
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2300);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed right-4 top-4 z-50 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2 text-sm text-primary shadow">
      {msg}
    </div>
  );
}
function TagBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs text-primary">
      {children}
    </span>
  );
}

/* -------------------------------------------
   Share modal (reusable, demo)
------------------------------------------- */
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
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
            <input type="checkbox" checked={allowDl} onChange={(e) => setAllowDl(e.target.checked)} />
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
            onClick={() => {
              // Copy dummy share link to clipboard (demo)
              const link = `${location.origin}/share/demo/${crypto.randomUUID()}`;
              navigator.clipboard?.writeText(link).catch(() => {});
              onCreate({ expiryDays: expiry, allowDownload: allowDl, password: pw || undefined });
            }}
            className="rounded-lg border border-[var(--surface-border)] bg-black/80 px-3 py-1.5 text-sm text-white hover:bg-black dark:bg-white/20 dark:text-white"
          >
            Create link
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------
   Sorting helpers & constants
------------------------------------------- */
type SortBy = "updatedAt" | "name" | "sizeKB";
type SortDir = "asc" | "desc";
const TYPE_ICON: Record<Doc["type"], string> = {
  pdf: "📕",
  word: "📝",
  excel: "📊",
  image: "🖼️",
  txt: "📄",
};

/* -------------------------------------------
   Page
------------------------------------------- */
const PAGE_SIZE = 6;
const TAGS: ("All" | Tag)[] = ["All", "Legal", "Finance", "Tech", "HR"];

// MIME whitelist (demo): hindari eksekutabel
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
]);

export default function Documents() {
  // state
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>(START_DOCS);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<"All" | Tag>("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dragActive, setDragActive] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // filter
  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return docs.filter((d) => {
      const okTag = tag === "All" || d.tag === tag;
      const okQ = !qx || d.name.toLowerCase().includes(qx) || d.owner.toLowerCase().includes(qx);
      return okTag && okQ;
    });
  }, [docs, q, tag]);

  // sort
  const sorted = useMemo(() => {
    const s = [...filtered];
    s.sort((a, b) => {
      let va: number | string = "";
      let vb: number | string = "";
      if (sortBy === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      if (sortBy === "sizeKB") { va = a.sizeKB; vb = b.sizeKB; }
      if (sortBy === "updatedAt") { va = a.updatedAt; vb = b.updatedAt; } // works for YYYY-MM-DD HH:mm
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [filtered, sortBy, sortDir]);

  // paginate
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const view = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // helpers
  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSel = () => setSelected(new Set());
  const selectAll = () => setSelected(new Set(view.map((d) => d.id)));

  function notReady(msg: string) {
    setToast(`${msg} — demo only`);
  }

  // upload (demo): validate + fake progress then add
  function onPickFiles() {
    fileInput.current?.click();
  }
  function sanitizeName(name: string) {
    // Amankan path traversal & karakter aneh (demo)
    return name.replaceAll(/[/\\]/g, "_").replaceAll(/[\u0000-\u001F]/g, "").trim();
  }
  function typeFromMime(m: string): Doc["type"] {
    if (m.includes("pdf")) return "pdf";
    if (m.includes("word")) return "word";
    if (m.includes("sheet")) return "excel";
    if (m.startsWith("image/")) return "image";
    return "txt";
  }
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    let added = 0;
    for (const f of Array.from(files)) {
      if (!ALLOWED.has(f.type)) {
        setToast(`Blocked: ${f.name} (type not allowed)`);
        continue;
      }
      if (f.size > 8 * 1024 * 1024) {
        setToast(`Too large (>8MB): ${f.name}`);
        continue;
      }

      // fake progress
      await new Promise<void>((resolve) => setTimeout(resolve, 250 + Math.random() * 400));

      const now = new Date();
      setDocs((cur) => [
        {
          id: crypto.randomUUID(),
          name: sanitizeName(f.name),
          owner: "you@client.com",
          updatedAt: now.toISOString().slice(0, 16).replace("T", " "),
          sizeKB: Math.max(1, Math.round(f.size / 1024)),
          tag: "Tech",
          type: typeFromMime(f.type),
        },
        ...cur,
      ]);
      added++;
    }
    if (added > 0) setToast(`Uploaded ${added} file(s) (demo)`);
  }

  // bulk actions (demo)
  function bulkDelete() {
    if (selected.size === 0) return;
    setDocs((cur) => cur.filter((d) => !selected.has(d.id)));
    clearSel();
    setToast("Deleted (demo)");
  }
  function bulkShare() {
    if (selected.size !== 1) return setToast("Select exactly 1 to share (demo)");
    const id = Array.from(selected)[0];
    const d = docs.find((x) => x.id === id) || null;
    setShareDoc(d);
  }

  // DnD handlers
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-semibold text-primary">Documents</h1>
        <p className="text-muted">Upload, kelola, dan bagikan dokumen secara aman.</p>
      </div>

      {/* TOOLBAR */}
      <div className="surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onPickFiles}
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
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              // Keamanan (demo): tidak pakai accept wildcard executable
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
            />
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search name/owner…"
              className="w-full max-w-xs rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Search documents"
            />
            <select
              value={tag}
              onChange={(e) => {
                setPage(1);
                setTag(e.target.value as any);
              }}
              className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Filter by tag"
            >
              {TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            {/* Sort controls */}
            <select
              value={sortBy}
              onChange={(e) => { setPage(1); setSortBy(e.target.value as SortBy); }}
              className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Sort by"
            >
              <option value="updatedAt">Updated</option>
              <option value="name">Name</option>
              <option value="sizeKB">Size</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
              aria-label="Toggle sort direction"
              title="Sort direction"
            >
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={selectAll}
            className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
          >
            Select page
          </button>
          <button
            onClick={clearSel}
            className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
          >
            Clear
          </button>
          <span className="text-xs text-muted">{selected.size} selected</span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={bulkShare}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Share
            </button>
            <button
              onClick={() => notReady("Download (bulk)")}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs opacity-80 hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Download
            </button>
            <button
              onClick={bulkDelete}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* DROPZONE */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragActive(false)}
        className={
          "surface border-dashed p-6 text-center text-sm text-muted shadow-[0_8px_30px_rgba(0,0,0,0.06)] " +
          (dragActive ? "ring-2 ring-indigo-400/60 bg-white/60 dark:bg-white/10" : "")
        }
      >
        <p>
          Drag & drop file ke sini, atau{" "}
          <button
            onClick={onPickFiles}
            className="underline decoration-indigo-400 underline-offset-2 hover:text-primary"
          >
            pilih file
          </button>
          . (pdf/docx/xlsx/png/jpg/txt, &lt; 8MB)
        </p>
      </div>

      {/* TABLE */}
      <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-base font-medium text-primary">All Documents</h2>

        {loading ? (
          <div className="space-y-3">
            <Shimmer className="h-12" />
            <Shimmer className="h-12" />
            <Shimmer className="h-12" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2">
                      <input
                        aria-label="Select all on page"
                        type="checkbox"
                        checked={view.every((d) => selected.has(d.id)) && view.length > 0}
                        onChange={(e) => (e.target.checked ? selectAll() : clearSel())}
                      />
                    </th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Owner</th>
                    <th className="py-2">Updated</th>
                    <th className="py-2">Size</th>
                    <th className="py-2">Tag</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((d) => (
                    <tr key={d.id} className="border-t border-[var(--surface-border)] hover:bg-neutral-50/50 dark:hover:bg-white/5">
                      <td className="py-2">
                        <input
                          aria-label={`Select ${d.name}`}
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggleSel(d.id)}
                        />
                      </td>
                      <td className="py-2 text-primary">
                        <span className="mr-2" aria-hidden>{TYPE_ICON[d.type]}</span>
                        {d.name}
                      </td>
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
                            onClick={() => {
                              const newName = prompt("Rename file to:", d.name);
                              if (!newName) return;
                              setDocs((cur) =>
                                cur.map((x) => (x.id === d.id ? { ...x, name: sanitizeName(newName) } : x))
                              );
                              setToast("Renamed (demo)");
                            }}
                            className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => notReady("Download")}
                            className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs opacity-80 hover:bg-neutral-50 dark:hover:bg-white/10"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => {
                              setDocs((cur) => cur.filter((x) => x.id !== d.id));
                              setToast("Deleted (demo)");
                            }}
                            className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs hover:bg-neutral-50 dark:hover:bg-white/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {view.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted">
                        No documents match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-white/10"
                >
                  Prev
                </button>
                <span className="text-xs text-primary">
                  {page}/{pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ShareModal
        doc={shareDoc}
        onClose={() => setShareDoc(null)}
        onCreate={() => {
          setShareDoc(null);
          setToast("Share link created (demo)");
          // produksi → POST ke /api/shares dengan withCsrfHeader(...)
          // await fetch("/api/shares", withCsrfHeader({ method:"POST", body: JSON.stringify({...}) }));
        }}
      />
    </section>
  );
}
