// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { localdb, ensureLocalReady, type Doc, type Tag } from "@/lib/localdb";

/* =========================
   UI helpers (shimmer, toast)
========================= */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={"relative overflow-hidden rounded-lg bg-[var(--surface-bg)] " + className} aria-hidden="true">
      <div className="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(0,0,0,.06),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)]" />
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }`}</style>
      <div className="h-full w-full opacity-0">.</div>
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
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

/* =========================
   Modals (inline, sederhana)
========================= */
function ModalShell({
    title,
    children,
    onClose,
    widthClass = "max-w-md",
  }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    widthClass?: string;
  }) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Overlay pakai util baru */}
        <div className="absolute inset-0 modal-overlay" onClick={onClose} aria-hidden="true" />
        {/* Kontainer modal pakai modal-surface (lebih opaque dari surface biasa) */}
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute left-1/2 top-1/2 w-[92vw] ${widthClass} -translate-x-1/2 -translate-y-1/2 modal-surface p-5 text-primary shadow-2xl`}
        >
          <h3 className="text-lg font-semibold">{title}</h3>
          {children}
        </div>
      </div>
    );
  }

function ShareModal({
  doc,
  onClose,
  onCreate,
}: {
  doc: Doc | null;
  onClose: () => void;
  onCreate: (opts: { expiryDays?: number; allowDownload: boolean; password?: string }) => void;
}) {
  const [expiry, setExpiry] = useState<number>(7);
  const [allowDl, setAllowDl] = useState(true);
  const [pw, setPw] = useState("");

  if (!doc) return null;
  return (
    <ModalShell title={`Share “${doc.name}”`} onClose={onClose}>
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
          onClick={() => onCreate({ expiryDays: expiry, allowDownload: allowDl, password: pw || undefined })}
          className="rounded-lg border border-[var(--surface-border)] bg-black/80 px-3 py-1.5 text-sm text-white hover:bg-black dark:bg-white/20 dark:text-white"
        >
          Create link
        </button>
      </div>
    </ModalShell>
  );
}

function RenameModal({
  doc,
  onClose,
  onSubmit,
}: {
  doc: Doc | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(doc?.name ?? "");
  useEffect(() => setName(doc?.name ?? ""), [doc]);
  if (!doc) return null;
  return (
    <ModalShell title="Rename document" onClose={onClose}>
      <div className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="text-muted">New name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2"
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
          onClick={() => onSubmit(name.trim())}
          className="rounded-lg border border-[var(--surface-border)] bg-black/80 px-3 py-1.5 text-sm text-white hover:bg-black dark:bg-white/20 dark:text-white"
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}

function UrlImportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setUrl("");
      setTimeout(() => ref.current?.focus(), 50);
    }
  }, [open]);
  if (!open) return null;
  return (
    <ModalShell title="Add document from URL" onClose={onClose}>
      <div className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="text-muted">Public URL (http/https)</span>
        </label>
        <input
          ref={ref}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/file.pdf"
          className="w-full rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(url.trim())}
          className="rounded-lg border border-[var(--surface-border)] bg-black/80 px-3 py-1.5 text-sm text-white hover:bg-black dark:bg-white/20 dark:text-white"
        >
          Add
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: Doc | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!doc) return null;
  return (
    <ModalShell title="Delete document" onClose={onClose}>
      <p className="mt-3 text-sm text-primary">
        Are you sure you want to delete <span className="font-medium">{doc.name}</span>?
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg border border-red-400 bg-red-600/90 px-3 py-1.5 text-sm text-white hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================
   Kecil: Badge & Sparkline
========================= */
function TagBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs text-primary">
      {children}
    </span>
  );
}

function Sparkline({ points }: { points: number[] }) {
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

/* =========================
   Halaman Dashboard
========================= */
type FilterTag = Tag | "All";

export default function DashboardPage() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<FilterTag>("All");
  const [toast, setToast] = useState<string | null>(null);

  // modals
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [renameDoc, setRenameDoc] = useState<Doc | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Init + seed demo (sekali)
  useEffect(() => {
    const ok = ensureLocalReady();
    setReady(ok);
    if (!ok) return;
    (async () => {
      // seed jika kosong
      await localdb.seedDemo();
      await refresh();
      setTimeout(() => setLoading(false), 350);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const items = await localdb.listDocs();
    setDocs(items);
  }

  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return docs.filter((d) => {
      const okTag = tag === "All" || d.tag === tag;
      const okQ = !qx || d.name.toLowerCase().includes(qx) || d.owner.toLowerCase().includes(qx);
      return okTag && okQ;
    });
  }, [docs, q, tag]);

  // Actions
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    for (const f of Array.from(files)) {
      await localdb.createDocFromFile(f, { owner: "you@client.com" });
    }
    await refresh();
    setLoading(false);
    setToast(`Uploaded ${files.length} file(s)`);
  }

  async function handleImportUrl(url: string) {
    if (!url) return;
    try {
      await localdb.createDocFromUrl(url, { owner: "you@client.com" });
      await refresh();
      setUrlOpen(false);
      setToast("Added from URL");
    } catch (e: any) {
      setToast(e?.message || "Invalid URL");
    }
  }

  async function doOpen(d: Doc) {
    const href = await localdb.fetchBlobURL(d.id);
    const url = href || d.remoteUrl;
    if (!url) {
      setToast("File data not found");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function doDownload(d: Doc) {
    const href = await localdb.fetchBlobURL(d.id);
    const url = href || d.remoteUrl;
    if (!url) {
      setToast("File data not found");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function doRename(id: string, name: string) {
    if (!name) return;
    await localdb.renameDoc(id, name);
    await refresh();
    setRenameDoc(null);
    setToast("Renamed");
  }

  async function doDelete(id: string) {
    await localdb.deleteDoc(id);
    await refresh();
    setDeleteDoc(null);
    setToast("Deleted");
  }

  async function doCreateShare(d: Doc, opts: { expiryDays?: number; allowDownload: boolean; password?: string }) {
    const s = await localdb.createShare(d.id, opts);
    setShareDoc(null);
    const link = `${location.origin}/share/${s.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast("Share link copied");
    } catch {
      setToast("Share link created");
    }
  }

  if (!ready) {
    return (
      <section className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
        <p className="text-muted">Your browser must support IndexedDB to run this demo.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
        <p className="text-muted">Ringkasan dokumen & aktivitas terbaru (local only).</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <Shimmer className="h-28" />
            <Shimmer className="h-28" />
            <Shimmer className="h-28" />
          </>
        ) : (
          [
            { label: "Total Documents", value: docs.length, sub: "Local only", series: [2, 4, 8, 8, 10, 12, 14, docs.length] },
            { label: "Shared Externally", value: 0, sub: "Use Share action", series: [0, 1, 1, 2, 3, 3, 4, 4] },
            { label: "Pending Reviews", value: 0, sub: "—", series: [3, 2, 2, 2, 2, 1, 1, 0] },
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

      {/* Toolbar */}
      <div className="surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Upload
            </button>
            <button
              onClick={() => setUrlOpen(true)}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              Add via URL
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
              onChange={(e) => setTag(e.target.value as FilterTag)}
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

      {/* Documents table */}
      <div className="surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-base font-medium text-primary">Recent Documents</h2>

        {loading ? (
          <div className="space-y-3">
            <Shimmer className="h-12" />
            <Shimmer className="h-12" />
            <Shimmer className="h-12" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--surface-border)] p-6 text-center text-sm text-muted">
            No documents. Try <span className="font-medium text-primary">Upload</span> or <span className="font-medium text-primary">Add via URL</span>.
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
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--surface-border)] hover:bg-neutral-50/50 dark:hover:bg-white/5">
                    <td className="py-2 text-primary">{d.name}</td>
                    <td className="py-2 text-primary">{d.owner}</td>
                    <td className="py-2 text-primary">{d.updatedAt}</td>
                    <td className="py-2 text-primary">{d.sizeKB ? `${d.sizeKB} KB` : "—"}</td>
                    <td className="py-2">
                      <TagBadge>{d.tag}</TagBadge>
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => doOpen(d)}
                          className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setShareDoc(d)}
                          className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => doDownload(d)}
                          className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary opacity-80 hover:bg-neutral-50 dark:hover:bg-white/10"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => setRenameDoc(d)}
                          className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary opacity-80 hover:bg-neutral-50 dark:hover:bg-white/10"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => setDeleteDoc(d)}
                          className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-white/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-2 text-xs text-muted">*Data disimpan lokal (localStorage/IndexedDB). Tidak ada server.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <ShareModal
        doc={shareDoc}
        onClose={() => setShareDoc(null)}
        onCreate={(opts) => shareDoc && doCreateShare(shareDoc, opts)}
      />
      <RenameModal
        doc={renameDoc}
        onClose={() => setRenameDoc(null)}
        onSubmit={(name) => renameDoc && doRename(renameDoc.id, name)}
      />
      <UrlImportModal open={urlOpen} onClose={() => setUrlOpen(false)} onSubmit={handleImportUrl} />
      <ConfirmDeleteModal doc={deleteDoc} onClose={() => setDeleteDoc(null)} onConfirm={() => deleteDoc && doDelete(deleteDoc.id)} />
    </section>
  );
}
