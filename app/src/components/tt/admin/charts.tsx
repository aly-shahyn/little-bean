import { useState } from "react";

import { mvr } from "../../../lib/catalog";

export const REV = "#2E8B62";
export const EXP = "#7A5CC8";

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

/** Top-rounded bar anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export type MonthPoint = { key: string; label: string; a: number; b: number };

/** Grouped bars, one shared axis: revenue vs expenses by month. */
export function GroupedBars({ data, aLabel = "Revenue", bLabel = "Expenses" }: { data: MonthPoint[]; aLabel?: string; bLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const W = 640, H = 240, L = 44, R = 8, T = 12, B = 26;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.a, d.b)), 0));
  const band = (W - L - R) / Math.max(1, data.length);
  const bw = Math.min(22, band * 0.3);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: REV }} />{aLabel}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: EXP }} />{bLabel}</span>
        <button type="button" onClick={() => setTable(!table)} className="ml-auto rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-tt-line hover:bg-tt-milk">{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-tt-soft"><tr><th className="py-1.5">Month</th><th>{aLabel}</th><th>{bLabel}</th><th>Difference</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.key} className="border-t border-tt-line"><td className="py-1.5">{d.label}</td><td>{mvr(d.a)}</td><td>{mvr(d.b)}</td><td className="font-semibold">{mvr(d.a - d.b)}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="relative mt-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${aLabel} and ${bLabel} by month`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#2A2440" strokeOpacity={t === 0 ? 0.25 : 0.07} />
                <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#75708C">{short(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = L + band * i + band / 2;
              return (
                <g key={d.key}>
                  {hover === i ? <rect x={L + band * i + 2} y={T} width={band - 4} height={H - T - B} rx={8} fill="#2A2440" fillOpacity={0.04} /> : null}
                  <path d={barPath(cx - bw - 1, y(d.a), bw, y(0) - y(d.a))} fill={REV} />
                  <path d={barPath(cx + 1, y(d.b), bw, y(0) - y(d.b))} fill={EXP} />
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#75708C">{d.label}</text>
                  <rect x={L + band * i} y={0} width={band} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.label}: ${aLabel} ${mvr(d.a)}, ${bLabel} ${mvr(d.b)}`} />
                </g>
              );
            })}
          </svg>
          {hover !== null && data[hover] ? (
            <div className="pointer-events-none absolute top-2 z-10 min-w-[160px] -translate-x-1/2 rounded-2xl bg-white px-3.5 py-2.5 text-xs shadow-lg ring-1 ring-tt-line" style={{ left: `${((L + band * hover + band / 2) / W) * 100}%` }}>
              <p className="font-bold">{data[hover].label}</p>
              <p className="mt-1 flex justify-between gap-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: REV }} />{aLabel}</span><b>{mvr(data[hover].a)}</b></p>
              <p className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: EXP }} />{bLabel}</span><b>{mvr(data[hover].b)}</b></p>
              <p className="mt-1 flex justify-between gap-3 border-t border-tt-line pt-1"><span>Difference</span><b>{mvr(data[hover].a - data[hover].b)}</b></p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars, single hue, value labels. */
export function HBars({ rows, color = REV, empty = "No data yet.", fmt = mvr }: { rows: { label: string; value: number; sub?: string }[]; color?: string; empty?: string; fmt?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <p className="text-sm text-tt-soft">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={`${r.label}: ${fmt(r.value)}${r.sub ? ` (${r.sub})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold">{fmt(r.value)}{r.sub ? <span className="ml-1 text-xs font-normal text-tt-soft">{r.sub}</span> : null}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-tt-ink/[0.05]">
            <div className="h-2 rounded-full transition-[width,opacity] duration-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.45 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny trend line for KPI tiles. */
export function Sparkline({ values, color = REV }: { values: number[]; color?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <p className="mt-2 text-xs text-tt-soft">No sales yet</p>;
  const W = 120, H = 36;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - (v / max) * (H - 6)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-[120px]" aria-hidden="true">
      <path d={`${d}L${W},${H}L0,${H}Z`} fill={color} fillOpacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}
