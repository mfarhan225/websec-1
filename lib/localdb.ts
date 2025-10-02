// lib/localdb.ts
// Client-only local storage + IndexedDB helper untuk simulasi CRUD tanpa backend.
// Aman untuk Netlify (semua berjalan di browser).

/* =========================
   Types
========================= */
export type Tag = "Legal" | "Finance" | "Tech";
export type ActivityType = "VIEW" | "SHARE" | "UPLOAD" | "DELETE" | "RENAME" | "FOLDER";

export type Doc = {
  id: string;
  name: string;
  owner: string;
  updatedAt: string;       // "YYYY-MM-DD HH:mm"
  sizeKB: number;
  tag: Tag;
  mime?: string;

  // Sumber data:
  hasBlob?: boolean;       // true jika blob disimpan di IndexedDB
  remoteUrl?: string;      // jika dokumen berasal dari URL publik (tanpa blob)

  folderId?: string | null;
};

export type Folder = {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
};

export type Share = {
  token: string;               // base64url random
  docId: string;
  createdAt: string;
  expiresAt?: string;          // ISO (optional)
  allowDownload: boolean;
  passwordHash?: string;       // SHA-256 hex (optional)
  revoked?: boolean;
};

export type Activity = {
  id: string;
  t: string;                   // "YYYY-MM-DD HH:mm"
  who: string;
  act: ActivityType;
  target: string;              // human readable
  meta?: Record<string, any>;
};

/* =========================
   Guards & constants
========================= */
const isBrowser = typeof window !== "undefined";
const LS_KEY_DOCS = "credense:docs";
const LS_KEY_FOLDERS = "credense:folders";
const LS_KEY_SHARES = "credense:shares";
const LS_KEY_ACTIVITY = "credense:activity";
const IDB_NAME = "credense-local";
const IDB_STORE = "files"; // { id, blob, name?, mime? }

/* =========================
   Small utils
========================= */
function nowStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function b64url(bytes: Uint8Array) {
  // base64url tanpa '='
  let s = btoa(String.fromCharCode(...bytes));
  s = s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return s;
}

function randomToken(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return b64url(arr);
}

async function sha256Hex(text: string) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const b = new Uint8Array(digest);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/* =========================
   LocalStorage JSON helpers
========================= */
function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

/* =========================
   IndexedDB (blob store)
========================= */
let idbPromise: Promise<IDBDatabase> | null = null;

function openIDB(): Promise<IDBDatabase> {
  if (!isBrowser) return Promise.reject(new Error("Not in browser"));
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" }); // value: { id, blob, mime?, name? }
      }
    };
    req.onsuccess = () => resolve(req.result);
  });

  return idbPromise;
}

async function idbPutBlob(id: string, blob: Blob, mime?: string, name?: string) {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(IDB_STORE);
    store.put({ id, blob, mime, name });
  });
}

async function idbGetBlob(id: string): Promise<{ blob: Blob; mime?: string; name?: string } | null> {
  const db = await openIDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string) {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(IDB_STORE).delete(id);
  });
}

/* =========================
   Store accessors
========================= */
function loadDocs(): Doc[] {
  return readJSON<Doc[]>(LS_KEY_DOCS, []);
}
function saveDocs(docs: Doc[]) {
  writeJSON(LS_KEY_DOCS, docs);
}

function loadFolders(): Folder[] {
  return readJSON<Folder[]>(LS_KEY_FOLDERS, []);
}
function saveFolders(folders: Folder[]) {
  writeJSON(LS_KEY_FOLDERS, folders);
}

function loadShares(): Share[] {
  return readJSON<Share[]>(LS_KEY_SHARES, []);
}
function saveShares(shares: Share[]) {
  writeJSON(LS_KEY_SHARES, shares);
}

function loadActivity(): Activity[] {
  return readJSON<Activity[]>(LS_KEY_ACTIVITY, []);
}
function saveActivity(items: Activity[]) {
  writeJSON(LS_KEY_ACTIVITY, items);
}

/* =========================
   Public API
========================= */
export const localdb = {
  /** Apakah boleh dipakai (harus di browser) */
  ready(): boolean {
    return isBrowser && !!window.indexedDB;
  },

  /* ----- Documents ----- */
  async listDocs(): Promise<Doc[]> {
    return loadDocs();
  },

  async getDoc(id: string): Promise<Doc | null> {
    return loadDocs().find((d) => d.id === id) ?? null;
  },

  async createDocFromFile(file: File, opts?: { owner?: string; tag?: Tag; folderId?: string | null }) {
    const id = crypto.randomUUID();
    const owner = opts?.owner ?? "you@client.com";
    const tag: Tag = opts?.tag ?? "Tech";
    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const doc: Doc = {
      id,
      name: file.name,
      owner,
      updatedAt: nowStr(),
      sizeKB,
      tag,
      mime: file.type || undefined,
      hasBlob: true,
      remoteUrl: undefined,
      folderId: opts?.folderId ?? null,
    };

    const docs = loadDocs();
    docs.unshift(doc);
    saveDocs(docs);
    await idbPutBlob(id, file, file.type, file.name);

    await this.addActivity({
      who: owner,
      act: "UPLOAD",
      target: file.name,
    });
    return doc;
  },

  async createDocFromUrl(url: string, opts?: { owner?: string; tag?: Tag; name?: string; folderId?: string | null }) {
    // Minimal sanitasi: hanya http(s)
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("Unsupported scheme");
      }
    } catch {
      throw new Error("Invalid URL");
    }

    const id = crypto.randomUUID();
    const owner = opts?.owner ?? "you@client.com";
    const name = opts?.name ?? url.split("/").pop() ?? "document";
    const tag: Tag = opts?.tag ?? "Tech";
    const doc: Doc = {
      id,
      name,
      owner,
      updatedAt: nowStr(),
      sizeKB: 0,
      tag,
      mime: undefined,
      hasBlob: false,
      remoteUrl: url,
      folderId: opts?.folderId ?? null,
    };

    const docs = loadDocs();
    docs.unshift(doc);
    saveDocs(docs);

    await this.addActivity({ who: owner, act: "UPLOAD", target: name, meta: { via: "url" } });
    return doc;
  },

  async renameDoc(id: string, newName: string) {
    const docs = loadDocs();
    const d = docs.find((x) => x.id === id);
    if (!d) throw new Error("Doc not found");
    d.name = newName;
    d.updatedAt = nowStr();
    saveDocs(docs);
    await this.addActivity({ who: d.owner, act: "RENAME", target: newName });
    return d;
  },

  async deleteDoc(id: string) {
    const docs = loadDocs();
    const idx = docs.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    const [d] = docs.splice(idx, 1);
    saveDocs(docs);
    await idbDelete(id);
    await this.addActivity({ who: d.owner, act: "DELETE", target: d.name });
    // Revoke all shares of this doc
    const shares = loadShares();
    shares.forEach((s) => {
      if (s.docId === id) s.revoked = true;
    });
    saveShares(shares);
    return true;
  },

  async fetchBlobURL(docId: string): Promise<string | null> {
    const d = await this.getDoc(docId);
    if (!d) return null;
    if (d.remoteUrl && !d.hasBlob) {
      // viewer bisa pakai remoteUrl langsung
      return d.remoteUrl;
    }
    const rec = await idbGetBlob(docId);
    if (!rec) return null;
    return URL.createObjectURL(rec.blob);
  },

  /* ----- Folders (minimal) ----- */
  async listFolders(): Promise<Folder[]> {
    return loadFolders();
  },

  async createFolder(name: string, parentId?: string | null) {
    const f: Folder = { id: crypto.randomUUID(), name, parentId: parentId ?? null, createdAt: nowStr() };
    const folders = loadFolders();
    folders.push(f);
    saveFolders(folders);
    await this.addActivity({ who: "you@client.com", act: "FOLDER", target: name });
    return f;
  },

  /* ----- Shares ----- */
  async listShares(docId?: string): Promise<Share[]> {
    const all = loadShares();
    return docId ? all.filter((s) => s.docId === docId) : all;
  },

  async createShare(
    docId: string,
    opts: { expiryDays?: number; allowDownload: boolean; password?: string }
  ): Promise<Share> {
    const d = await this.getDoc(docId);
    if (!d) throw new Error("Doc not found");

    const token = randomToken(16);
    const createdAt = new Date();
    const expiresAt =
      opts.expiryDays && opts.expiryDays > 0
        ? new Date(createdAt.getTime() + opts.expiryDays * 24 * 60 * 60 * 1000)
        : undefined;

    const share: Share = {
      token,
      docId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      allowDownload: !!opts.allowDownload,
      passwordHash: opts.password ? await sha256Hex(opts.password) : undefined,
      revoked: false,
    };

    const shares = loadShares();
    shares.push(share);
    saveShares(shares);

    await this.addActivity({ who: d.owner, act: "SHARE", target: d.name, meta: { token } });
    return share;
  },

  async getShareByToken(token: string): Promise<{ share: Share; doc: Doc } | null> {
    const shares = loadShares();
    const s = shares.find((x) => x.token === token);
    if (!s) return null;
    const doc = await this.getDoc(s.docId);
    if (!doc) return null;
    return { share: s, doc };
  },

  isShareActive(share: Share): boolean {
    if (share.revoked) return false;
    if (share.expiresAt) {
      const exp = new Date(share.expiresAt).getTime();
      if (Date.now() > exp) return false;
    }
    return true;
  },

  async verifySharePassword(share: Share, password?: string): Promise<boolean> {
    if (!share.passwordHash) return true; // tidak butuh password
    if (!password) return false;
    const h = await sha256Hex(password);
    return h === share.passwordHash;
  },

  async revokeShare(token: string): Promise<boolean> {
    const shares = loadShares();
    const s = shares.find((x) => x.token === token);
    if (!s) return false;
    s.revoked = true;
    saveShares(shares);
    return true;
  },

  /* ----- Activity ----- */
  async listActivity(): Promise<Activity[]> {
    return loadActivity();
  },

  async addActivity(a: { who: string; act: ActivityType; target: string; meta?: Record<string, any> }) {
    const items = loadActivity();
    items.unshift({
      id: crypto.randomUUID(),
      t: nowStr(),
      who: a.who,
      act: a.act,
      target: a.target,
      meta: a.meta,
    });
    saveActivity(items);
  },

  /* ----- Demo seeding (opsional) ----- */
  async seedDemo() {
    const existing = loadDocs();
    if (existing.length > 0) return;

    // 2 contoh dokumen publik (tanpa blob)
    const d1: Doc = {
      id: crypto.randomUUID(),
      name: "Zero Trust Whitepaper.pdf",
      owner: "you@client.com",
      updatedAt: nowStr(),
      sizeKB: 1024,
      tag: "Tech",
      remoteUrl: "https://www.cloudflare.com/resources/assets/slt3lc6tev37/6sG3p6u1o0dXvH0iYkYlJw/3e60f5c5a7e1f6f0212db37c0c9a2f44/whitepaper-zero-trust.pdf",
      hasBlob: false,
    };
    const d2: Doc = {
      id: crypto.randomUUID(),
      name: "Sample NDA Template.docx",
      owner: "legal@client.com",
      updatedAt: nowStr(),
      sizeKB: 256,
      tag: "Legal",
      remoteUrl: "https://file-examples.com/storage/fe1f0f1d2b3d6d1f3c9a1c0/2017/02/file-sample_100kB.docx",
      hasBlob: false,
    };

    saveDocs([d1, d2]);
    await this.addActivity({ who: "you@client.com", act: "UPLOAD", target: d1.name, meta: { via: "url" } });
    await this.addActivity({ who: "legal@client.com", act: "UPLOAD", target: d2.name, meta: { via: "url" } });
  },
};

/* =========================
   SSR-safe default exports
========================= */
// Agar import di server tidak meledak, sediakan no-op fallback jika !ready():
export function ensureLocalReady() {
  if (!localdb.ready()) {
    // Tidak perlu throw; biarkan pemanggil cek .ready() dulu.
    return false;
  }
  return true;
}
