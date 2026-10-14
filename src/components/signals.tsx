import Link from "next/link";
import type { Signal } from "@/lib/instruments";
import Icon from "./Icon";

export const fmtPrice = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const VERDICT = {
  "Strong buy": "bg-win text-white",
  Buy: "bg-win-soft text-win",
  Neutral: "bg-raised text-muted",
  Sell: "bg-loss-soft text-loss",
  "Strong sell": "bg-loss text-white",
};

export function VerdictBadge({ verdict, large = false }: { verdict: Signal["verdict"]; large?: boolean }) {
  return <span className={`inline-flex shrink-0 rounded-lg font-bold ${VERDICT[verdict]} ${large ? "px-3.5 py-1.5 text-base" : "px-2.5 py-1 text-xs"}`}>{verdict}</span>;
}

export function ScoreMeter({ score }: { score: number }) {
  const pos = (score + 100) / 2;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-loss/35 via-raised to-win/35" title={`Score ${score} out of ±100`}>
        <div className="absolute inset-y-[-3px] left-1/2 w-px bg-muted/50" />
        <div className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel ${score >= 25 ? "bg-win" : score <= -25 ? "bg-loss" : "bg-muted"}`} style={{ left: `${pos}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-muted">
        <span>Sell</span>
        <span>Buy</span>
      </div>
    </div>
  );
}

export function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(2)},${(28 - ((v - min) / (max - min || 1)) * 26).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "var(--win)" : "var(--loss)"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function SignalCard({ s }: { s: Signal }) {
  const top = s.reasons.find((r) => (s.score >= 0 ? r.tone === "bull" : r.tone === "bear")) ?? s.reasons[0];
  return (
    <Link href={`/signals/${s.id}`} className="card flex flex-col gap-3 p-4 transition-colors hover:border-brand/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{s.name}</p>
          <p className="text-sm text-muted">
            {fmtPrice(s.price, s.decimals)}{" "}
            <span className={s.change24h >= 0 ? "text-win" : "text-loss"}>
              {s.change24h >= 0 ? "+" : ""}
              {(s.change24h * 100).toFixed(2)}%
            </span>
          </p>
        </div>
        <Sparkline values={s.spark} up={s.change24h >= 0} />
      </div>
      <div className="flex items-center gap-3">
        <VerdictBadge verdict={s.verdict} />
        <div className="flex-1">
          <ScoreMeter score={s.score} />
        </div>
      </div>
      {top && (
        <p className="flex gap-1.5 text-sm text-muted">
          <Icon name={top.tone === "bull" ? "arrowUp" : top.tone === "bear" ? "arrowDown" : "list"} className={`mt-0.5 h-4 w-4 shrink-0 ${top.tone === "bull" ? "text-win" : top.tone === "bear" ? "text-loss" : ""}`} />
          {top.text}
        </p>
      )}
    </Link>
  );
}
