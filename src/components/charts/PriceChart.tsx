"use client";

import { useEffect, useRef, useState } from "react";
import type { ChartBar } from "@/hooks/useSignal";
import { fmtPrice } from "../signals";

type Line = { value: number; label: string; color: string };

const PAD = { top: 12, right: 64, bottom: 24, left: 8 };

export default function PriceChart({ bars, lines, decimals, intraday }: { bars: ChartBar[]; lines: Line[]; decimals: number; intraday: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const H = W < 500 ? 260 : 340;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = bars.slice(W < 500 ? -60 : -120);
  const values = [...shown.flatMap((b) => [b.h, b.l]), ...lines.map((l) => l.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.04;
  const lo = min - pad;
  const hi = max + pad;
  const step = (W - PAD.left - PAD.right) / shown.length;
  const x = (i: number) => PAD.left + step * (i + 0.5);
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = (key: "ema20" | "ema50") =>
    shown.map((b, i) => (isNaN(b[key]) ? "" : `${i && !isNaN(shown[i - 1][key]) ? "L" : "M"}${x(i).toFixed(1)},${y(b[key]).toFixed(1)}`)).join("");
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / 5).filter((t) => lines.every((l) => Math.abs(y(t) - y(l.value)) > 20));
  const fmtTime = (t: number) =>
    new Date(t).toLocaleString(undefined, intraday ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "2-digit" });
  const active = hover != null ? shown[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.min(Math.max(Math.floor((px - PAD.left) / step), 0), shown.length - 1));
  };

  return (
    <div ref={box} className="relative">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-win" /><span className="-ml-1 h-2.5 w-2.5 rounded-sm bg-loss" /> Candles</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> EMA 20</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-news" /> EMA 50</span>
        {lines.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: l.color }} /> {l.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Price chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={W - PAD.right + 6} y={y(t) + 4} fontSize="11" fill="var(--muted)">{fmtPrice(t, decimals)}</text>
          </g>
        ))}
        {shown.map((b, i) => {
          const up = b.c >= b.o;
          const color = up ? "var(--win)" : "var(--loss)";
          const bw = Math.max(1.5, step * 0.62);
          return (
            <g key={b.t}>
              <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={color} strokeWidth="1" />
              <rect x={x(i) - bw / 2} y={y(Math.max(b.o, b.c))} width={bw} height={Math.max(1, Math.abs(y(b.o) - y(b.c)))} fill={color} rx="1" />
            </g>
          );
        })}
        <path d={path("ema20")} fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d={path("ema50")} fill="none" stroke="var(--news)" strokeWidth="2" />
        {lines.map((l) => (
          <g key={l.label}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeWidth="1.5" strokeDasharray="6 4" />
            <rect x={W - PAD.right + 2} y={y(l.value) - 9} width={PAD.right - 4} height={18} rx="4" fill={l.color} />
            <text x={W - PAD.right / 2} y={y(l.value) + 4} fontSize="10.5" fontWeight="600" textAnchor="middle" fill="white">{fmtPrice(l.value, decimals)}</text>
          </g>
        ))}
        {active && <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeOpacity="0.5" />}
        {shown.length > 0 && (
          <>
            <text x={PAD.left} y={H - 6} fontSize="11" fill="var(--muted)">{fmtTime(shown[0].t)}</text>
            <text x={W - PAD.right} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="end">{fmtTime(shown[shown.length - 1].t)}</text>
          </>
        )}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-8 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > shown.length / 2 ? "-108%" : "8%"})` }}
        >
          <p className="font-semibold">{fmtTime(active.t)}</p>
          <p className="text-muted">
            O {fmtPrice(active.o, decimals)} H {fmtPrice(active.h, decimals)}
            <br />L {fmtPrice(active.l, decimals)} C {fmtPrice(active.c, decimals)}
          </p>
        </div>
      )}
    </div>
  );
}
