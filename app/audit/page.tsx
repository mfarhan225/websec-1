"use client";

import { useMemo, useState } from "react";

// ===== Types & Seed Data (dibikin agak banyak supaya kelihatan pagination) =====
type Act = "LOGIN" | "UPLOAD" | "SHARE" | "DOWNLOAD" | "VIEW";
type LogItem = {
  id: string;
  t: string;          // ISO time
  who: string;
  ip: string;
  act: Act;
  target?: string;
  ok: boolean;
};

const base: LogItem[] = [
  { id: "1",  t: "2025-09-12T10:22:00Z", who: "you@client.com",   ip: "203.0.113.5",  act: "VIEW",     target: "MSA_Acorn_Corp_v3.pdf", ok: true  },
  { id: "2",  t: "2025-09-12T10:18:00Z", who: "pm@client.com",    ip: "203.0.113.7",  act: "SHARE",    target: "Q3_Financials.xlsx",    ok: true  },
  { id: "3",  t: "2025-09-11T17:02:00Z", who: "legal@client.com", ip: "198.51.100.9", act: "UPLOAD",   target: "NDA-Redline.docx",      ok: true  },
  { id: "4",  t: "2025-09-10T08:10:00Z", who: "attacker@evil.tld",ip: "203.0.113.99", act: "LOGIN",                                 ok: false },
  { id: "5",  t: "2025-09-10T08:12:00Z", who: "attacker@evil.tld",ip: "203.0.113.99", act: "LOGIN",                                 ok: false },
  { id: "6",  t: "2025-09-10T08:15:00Z", who: "attacker@evil.tld",ip: "203.0.113.99", act: "LOGIN",                                 ok: false },
  { id: "7",  t: "2025-09-09T21:11:00Z", who: "ceo@client.com",   ip: "203.0.113.17", act: "DOWNLOAD", target: "Board_Deck.pdf",       ok: true  },
  { id: "8",  t: "2025-09-09T05:40:00Z", who: "ops@client.com",   ip: "198.51.100.12",act: "VIEW",     target: "Prod_Runbook.pdf",     ok: true  },
  { id: "9",  t: "2025-09-08T23:58:00Z", who: "ops@client.com",   ip: "198.51.100.12",act: "UPLOAD",   target: "Incidents_Sept.csv",    ok: true  },
  { id: "10", t: "2025-09-08T10:05:00Z", who: "finance@client.com",ip:"203.0.113.7",  act: "VIEW",     target: "Q3_Financials.xlsx",    ok: true  },
];
// duplikasi & variasi tanggal biar ramai
const SEED: LogItem[] = [
  ...base,
  ...base.map((r,i)=>({ ...r, id: String(100+i), t: shiftDay(r.t, -1), who: i%3? r.who : "cto@client.com" })),
  ...base.map((r,i)=>({ ...r, id: String(200+i), t: shiftDay(r.t, -3) })),
  ...base.map((r,i)=>({ ...r, id: String(300+i), t: shiftDay(r.t, -7) })),
];

function shiftDay(iso: string, d: number) {
  const x = new Date(iso); x.setUTCDate(x.getUTCDate()+d); return x.toISOString();
}

const ACTS = ["All","LOGIN","UPLOAD","SHARE","DOWNLOAD","VIEW"] as const;
const STS  = ["All","OK","Fail"] as const;

// ===== Helpers =====
function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}
function byDayKey(dt: string) {
  const d = new Date(dt);
  return d.toISOString().slice(0,10); // yyyy-mm-dd
}

export default function Audit() {
  // filters
  const [q, setQ] = useState("");
  const [act, setAct] = useState<(typeof ACTS)[number]>("All");
  const [st, setSt]   = useState<(typeof STS)[number]>("All");
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPS] = useState(10);

  // derived: filtered
  const filtered = useMemo(() => {
    return SEED.filter((row) => {
      const txt = `${row.who} ${row.ip} ${row.target ?? ""}`.toLowerCase();
      if (q && !txt.includes(q.toLowerCase())) return false;
      if (act !== "All" && row.act !== act) return false;
      if (st !== "All") {
        const wantOk = st === "OK";
        if (row.ok !== wantOk) return false;
      }
      if (from) {
        const dFrom = new Date(from+"T00:00:00");
        if (new Date(row.t) < dFrom) return false;
      }
      if (to) {
        const dTo = new Date(to+"T23:59:59");
        if (new Date(row.t) > dTo) return false;
      }
      return true;
    });
  }, [q, act, st, from, to]);

  // stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const ok = filtered.filter(r=>r.ok).length;
    const fail = total-ok;
    const users = new Set(filtered.map(r=>r.who)).size;
    const ips   = new Set(filtered.map(r=>r.ip)).size;
    return { total, ok, fail, users, ips };
  }, [filtered]);

  // trend 14 hari (sparkline)
  const spark = useMemo(() => {
    const days = 14;
    const today = new Date();
    const labels: string[] = [];
    const counts: number[] = [];
    for (let i=days-1;i>=0;i--){
      const d = new Date(today); d.setUTCDate(d.getUTCDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(key);
      counts.push(filtered.filter(r=>byDayKey(r.t)===key).length);
    }
    return { labels, counts };
  }, [filtered]);

  // Top users
  const topUsers = useMemo(()=>{
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.who, (map.get(r.who)||0)+1);
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [filtered]);

  // Suspicious signals (simple)
  const suspicious = useMemo(()=>{
    // IP dengan gagal LOGIN > 2
    const failsByIp = new Map<string, number>();
    filtered.forEach(r=>{
      if (r.act==="LOGIN" && !r.ok) failsByIp.set(r.ip,(failsByIp.get(r.ip)||0)+1);
    });
    const brute = [...failsByIp.entries()].filter(([_,c])=>c>=3).map(([ip,c])=>({type:"Brute force?", ip, count:c}));

    // Akses di jam aneh (<06 atau >=22)
    const odd: {who:string; t:string; act:Act}[] = [];
    filtered.forEach(r=>{
      const hr = new Date(r.t).getUTCHours();
      if (hr<6 || hr>=22) odd.push({who:r.who,t:r.t,act:r.act});
    });

    return { brute, odd: odd.slice(0,5) };
  }, [filtered]);

  // pagination slice
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const view = filtered
    .slice()
    .sort((a,b)=>+new Date(b.t)-+new Date(a.t))
    .slice((cur-1)*pageSize, (cur)*pageSize);

  function clear() {
    setQ(""); setAct("All"); setSt("All"); setFrom(""); setTo(""); setPage(1);
  }

  function exportCsv() {
    const rows = [
      ["time","who","ip","action","target","status"],
      ...filtered.map(r => [r.t, r.who, r.ip, r.act, r.target ?? "", r.ok ? "OK":"Fail"]),
    ];
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download="audit.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function copyRow(r: LogItem) {
    const obj = { ...r };
    navigator.clipboard?.writeText(JSON.stringify(obj, null, 2));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Audit Log</h1>
        <p className="text-muted">Riwayat aksi: login, upload, share, download, dll.</p>
      </div>

      {/* Filter bar */}
      <div className="surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-end gap-3">
          <input
            value={q}
            onChange={(e)=>{ setQ(e.target.value); setPage(1); }}
            placeholder="Cari email / file / IP…"
            className="flex-1 min-w-[220px] rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary placeholder:text-muted
                       dark:bg-white/10 dark:text-white"
          />
          <select
            value={act}
            onChange={(e)=>{ setAct(e.target.value as any); setPage(1); }}
            className="w-44 shrink-0 rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                       dark:bg-white/10 dark:text-white"
          >
            {ACTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={st}
            onChange={(e)=>{ setSt(e.target.value as any); setPage(1); }}
            className="w-40 shrink-0 rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                       dark:bg-white/10 dark:text-white"
          >
            {STS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }}
            className="w-40 shrink-0 rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                      dark:bg-white/10 dark:text-white" />
          <input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); }}
            className="w-40 shrink-0 rounded-lg border border-[var(--surface-border)] bg-white/90 px-3 py-2 text-sm text-primary
                      dark:bg-white/10 dark:text-white" />
          <button onClick={clear}
            className="shrink-0 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10">
            Clear
          </button>
        </div>

        {/* KPI + Sparkline */}
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className="surface p-3">
            <div className="text-xs text-muted">Total</div>
            <div className="text-xl font-semibold text-primary">{stats.total}</div>
          </div>
          <div className="surface p-3">
            <div className="text-xs text-muted">OK</div>
            <div className="text-xl font-semibold text-primary">{stats.ok}</div>
          </div>
          <div className="surface p-3">
            <div className="text-xs text-muted">Fail</div>
            <div className="text-xl font-semibold text-primary">{stats.fail}</div>
          </div>
          <div className="surface p-3">
            <div className="text-xs text-muted">Unique Users</div>
            <div className="text-xl font-semibold text-primary">{stats.users}</div>
          </div>
          <div className="surface p-3">
            <div className="text-xs text-muted">Unique IPs</div>
            <div className="text-xl font-semibold text-primary">{stats.ips}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">Trend 14 hari terakhir</div>
          {/* sparkline */}
          <Sparkline data={spark.counts} />
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e)=>{ setPS(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-[var(--surface-border)] bg-white/90 px-2 py-2 text-sm text-primary dark:bg-white/10 dark:text-white"
            >
              {[10,25,50].map(n=><option key={n} value={n}>{n}/page</option>)}
            </select>
            <button onClick={exportCsv}
              className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-primary hover:bg-neutral-50 dark:hover:bg-white/10">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content grid: Table + Side widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* table */}
        <div className="md:col-span-2 surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">User</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--surface-border)]">
                    <td className="py-2 text-primary">{fmt(r.t)}</td>
                    <td className="py-2 text-primary">{r.who}</td>
                    <td className="py-2 text-primary">{r.ip}</td>
                    <td className="py-2 text-primary">{r.act}</td>
                    <td className="py-2 text-primary">{r.target ?? "-"}</td>
                    <td className="py-2">
                      <span className={[
                        "rounded-full border px-2 py-0.5 text-xs",
                        r.ok
                          ? "text-primary border-[var(--surface-border)]"
                          : "text-red-600 border-red-300 dark:text-red-300 dark:border-red-400/40"
                      ].join(" ")}>
                        {r.ok ? "OK" : "Fail"}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={()=>copyRow(r)}
                        className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-primary hover:bg-neutral-50 dark:hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {view.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">No results.</p>
            )}
          </div>

          {/* pagination footer */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="text-muted">
              Page <span className="text-primary">{cur}</span> of <span className="text-primary">{pages}</span> — total{" "}
              <span className="text-primary">{filtered.length}</span> rows
            </div>
            <div className="flex gap-2">
              <button disabled={cur<=1} onClick={()=>setPage(1)}
                className="rounded border border-[var(--surface-border)] px-2 py-1 disabled:opacity-50">« First</button>
              <button disabled={cur<=1} onClick={()=>setPage(cur-1)}
                className="rounded border border-[var(--surface-border)] px-2 py-1 disabled:opacity-50">‹ Prev</button>
              <button disabled={cur>=pages} onClick={()=>setPage(cur+1)}
                className="rounded border border-[var(--surface-border)] px-2 py-1 disabled:opacity-50">Next ›</button>
              <button disabled={cur>=pages} onClick={()=>setPage(pages)}
                className="rounded border border-[var(--surface-border)] px-2 py-1 disabled:opacity-50">Last »</button>
            </div>
          </div>
        </div>

        {/* Side widgets */}
        <div className="space-y-4">
          <div className="surface p-4">
            <h3 className="text-sm font-medium text-primary">Top Users</h3>
            <ul className="mt-2 space-y-2">
              {topUsers.map(([u,c])=>(
                <li key={u} className="flex items-center justify-between text-sm">
                  <span className="text-primary">{u}</span>
                  <span className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs">{c}</span>
                </li>
              ))}
              {topUsers.length===0 && <li className="text-sm text-muted">No data.</li>}
            </ul>
          </div>

          <div className="surface p-4">
            <h3 className="text-sm font-medium text-primary">Suspicious Signals</h3>
            <div className="mt-2 space-y-2">
              {suspicious.brute.map((b, i)=>(
                <div key={`b${i}`} className="rounded-lg border border-red-300/60 dark:border-red-400/40 p-2 text-sm">
                  <div className="text-red-600 dark:text-red-300 font-medium">Brute force?</div>
                  <div className="text-muted">IP {b.ip} — {b.count} failed logins</div>
                </div>
              ))}
              {suspicious.odd.map((o,i)=>(
                <div key={`o${i}`} className="rounded-lg border border-[var(--surface-border)] p-2 text-sm">
                  <div className="text-primary"><b>{o.who}</b> → {o.act}</div>
                  <div className="text-muted">{fmt(o.t)} (unusual hour)</div>
                </div>
              ))}
              {suspicious.brute.length===0 && suspicious.odd.length===0 && (
                <div className="text-sm text-muted">No suspicious pattern.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Minimal inline sparkline (no deps) */
function Sparkline({ data }: { data: number[] }) {
  const W = 220, H = 44, pad = 4;
  const max = Math.max(1, ...data);
  const step = (W - pad*2) / Math.max(1, data.length-1);
  const points = data.map((v,i)=>{
    const x = pad + i*step;
    const y = H - pad - (v/max)*(H - pad*2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded-md border border-[var(--surface-border)] bg-white/70 dark:bg-white/10">
      <polyline fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2"
        points={points} className="text-indigo-600 dark:text-indigo-300" />
    </svg>
  );
}
