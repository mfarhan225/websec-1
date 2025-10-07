"use client";

type Props = {
  usedBytes?: number;   // default demo: 1.2 GB
  quotaBytes?: number;  // default demo: 10 GB
  collapsed?: boolean;
};

function fmtBytes(n: number) {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export default function SidebarStorage({
  usedBytes = 1.2 * 1024 ** 3,
  quotaBytes = 10 * 1024 ** 3,
  collapsed = false,
}: Props) {
  const pct = Math.max(0, Math.min(100, (usedBytes / quotaBytes) * 100));
  const label = `${fmtBytes(usedBytes)} / ${fmtBytes(quotaBytes)}`;

  return (
    <div className="sidebar-card p-3 text-xs" aria-label="Storage usage">
      {collapsed ? (
        <div className="text-center font-medium">{fmtBytes(usedBytes)}</div>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">Storage</span>
            <span className="tabular-nums">{label}</span>
          </div>
          <div className="h-2 rounded-full bg-black/10 dark:bg-black/20">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} aria-hidden />
          </div>
        </>
      )}
    </div>
  );
}
