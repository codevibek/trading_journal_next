"use client";

import Link from "next/link";
import { useInsights, type Bucket } from "@/hooks/useInsights";
import { pct, rMultiple } from "@/lib/format";
import { BREAKEVEN_WIN_RATE } from "@/lib/trading";

const DOT = { edge: "bg-win", leak: "bg-loss", unclear: "bg-text", few: "bg-muted" };
const WHISKER = { edge: "bg-win/40", leak: "bg-loss/40", unclear: "bg-text/25", few: "bg-muted/25" };

function BucketRow({ b }: { b: Bucket }) {
  return (
    <li className={`grid grid-cols-[minmax(0,6.5rem)_1fr_3.5rem] sm:grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 py-2.5 text-sm ${b.verdict === "few" ? "opacity-60" : ""}`}>
      <span className="truncate">
        {b.label}
        <span className="block text-xs text-muted">{b.n} trade{b.n === 1 ? "" : "s"}</span>
      </span>
      <div className="relative h-6" title={`Likely between ${pct(b.low)} and ${pct(b.high)}`}>
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className="absolute inset-y-1 w-0.5 bg-amber" style={{ left: `${BREAKEVEN_WIN_RATE * 100}%` }} />
        <div className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${WHISKER[b.verdict]}`} style={{ left: `${b.low * 100}%`, width: `${(b.high - b.low) * 100}%` }} />
        <div className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${DOT[b.verdict]}`} style={{ left: `${b.winRate * 100}%` }} />
      </div>
      <span className="text-right">
        <span className="font-semibold">{pct(b.winRate)}</span>
        <span className={`block text-xs ${b.expR > 0 ? "text-win" : b.expR < 0 ? "text-loss" : "text-muted"}`}>{rMultiple(b.expR)}</span>
      </span>
    </li>
  );
}

export default function InsightsPage() {
  const ins = useInsights();
  const o = ins.overall;

  if (ins.loading) return <p className="text-muted">Loading…</p>;

  if (!o.n) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-muted">
          Nothing to analyse yet. <Link href="/import" className="text-amber">Import your Notion log</Link> or <Link href="/journal/new" className="text-amber">log a trade</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <select value={ins.strategy} onChange={(e) => ins.setStrategy(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
          <option value="All">All strategies</option>
          {ins.strategies.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm text-muted">
          At 1:2 risk to reward you break even at a {pct(BREAKEVEN_WIN_RATE, 1)} win rate.
        </p>
        <p className="mt-2 text-3xl font-semibold">
          {pct(o.winRate)} <span className="text-base font-normal text-muted">won across {o.n} trades</span>
        </p>
        <p className={`mt-1 ${o.expR > 0 ? "text-win" : "text-loss"}`}>
          {rMultiple(o.expR)} per trade on average, {o.totalUsd >= 0 ? "+" : "−"}${Math.abs(Math.round(o.totalUsd)).toLocaleString()} in total
        </p>
      </section>

      {ins.progress && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-muted">Pulling BTC candles for each trade: {ins.progress.done} of {ins.progress.total}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-amber transition-all" style={{ width: `${(ins.progress.done / Math.max(ins.progress.total, 1)) * 100}%` }} />
          </div>
        </div>
      )}
      {ins.error && (
        <p className="text-sm text-loss">
          {ins.error} <button onClick={() => ins.analyse()} className="underline">Try again</button>
        </p>
      )}
      {ins.offCandle > 0 && (
        <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">
          {ins.offCandle === 1 ? "1 trade has" : `${ins.offCandle} trades have`} an entry price outside its 15m candle. If that&apos;s most of them, the import timezone is probably wrong. Re-import with the right one before trusting these numbers.
        </p>
      )}

      <section className="flex flex-col gap-1 text-sm text-muted">
        <p>Each dot is the win rate. The bar around it is the range it could really be, given how few trades there are. The amber line is breakeven.</p>
        <p>
          <span className="text-win">Green</span> means the whole range sits above breakeven, <span className="text-loss">red</span> means it sits below. Faded rows have fewer than 10 trades.
        </p>
      </section>

      {ins.dimensions.map((d) => (
        <section key={d.title} className="rounded-2xl border border-line bg-panel px-5 py-4">
          <h2 className="font-semibold">{d.title}</h2>
          {d.hint && <p className="text-sm text-muted">{d.hint}</p>}
          <ul className="mt-2 divide-y divide-line">
            {d.buckets.map((b) => <BucketRow key={b.label} b={b} />)}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap gap-3 text-sm">
        <a href="/api/export" className="rounded-lg border border-line px-4 py-2">Download data for Python</a>
        <button onClick={() => ins.analyse(true)} disabled={!!ins.progress} className="rounded-lg border border-line px-4 py-2 disabled:opacity-50">
          Re-analyse all trades
        </button>
      </div>
      <p className="text-xs text-muted">{ins.analysed} of {o.n} trades have market data. Patterns from a few dozen trades are often noise, so treat these as ideas to test, not rules.</p>
    </div>
  );
}
