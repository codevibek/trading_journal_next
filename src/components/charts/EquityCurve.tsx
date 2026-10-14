"use client";

import { useEffect, useRef, useState } from "react";
import { RISK_USD } from "@/lib/trading";

type Point = { time: string; r: number };

const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

const fmtR = (r: number) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}R`;

export default function EquityCurve({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  const H = W < 500 ? 190 : 240;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const series = [{ time: points[0]?.time, r: 0 }, ...points];
  const min = Math.min(0, ...series.map((p) => p.r));
  const max = Math.max(1, ...series.map((p) => p.r));
  const x = (i: number) => PAD.left + (i / Math.max(series.length - 1, 1)) * (W - PAD.left - PAD.right);
  const y = (r: number) => PAD.top + ((max - r) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.r).toFixed(1)}`).join("");
  const area = `${line}L${x(series.length - 1)},${y(min)}L${x(0)},${y(min)}Z`;
  const ticks = [...new Set([min, 0, Math.round((min + max) / 2), max])];
  const active = hover != null ? series[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (series.length - 1));
    setHover(Math.min(Math.max(i, 0), series.length - 1));
  };

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Cumulative R over time">
        <defs>
          <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{fmtR(t)}</text>
          </g>
        ))}
        <path d={area} fill="url(#eq-fill)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active && (
          <>
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeOpacity="0.5" />
            <circle cx={x(hover!)} cy={y(active.r)} r="5" fill="var(--brand)" stroke="var(--panel)" strokeWidth="2" />
          </>
        )}
        {points.length > 0 && (
          <>
            <text x={PAD.left} y={H - 6} fontSize="11" fill="var(--muted)">{new Date(points[0].time).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</text>
            <text x={W - PAD.right} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">{new Date(points[points.length - 1].time).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</text>
          </>
        )}
      </svg>
      {active && hover! > 0 && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > series.length / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-semibold">{fmtR(active.r)} · {active.r * RISK_USD >= 0 ? "+" : "−"}${Math.abs(active.r * RISK_USD).toLocaleString()}</p>
          <p className="text-muted">Trade {hover} on {new Date(active.time).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
        </div>
      )}
    </div>
  );
}
