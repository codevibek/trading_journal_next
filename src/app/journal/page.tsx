"use client";

import Link from "next/link";
import RBadge from "@/components/RBadge";
import { useTrades } from "@/hooks/useTrades";
import { dateTime, pct, price, rMultiple } from "@/lib/format";

export default function JournalPage() {
  const { trades, loading, error, strategies, filters, stats } = useTrades();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.count} trades, {pct(stats.winRate)} won, {rMultiple(stats.totalR)} ({stats.totalUsd >= 0 ? "+" : "−"}${Math.abs(stats.totalUsd).toLocaleString()})
          </p>
        </div>
        <Link href="/journal/new" className="rounded-lg bg-amber px-4 py-2.5 text-sm font-medium text-bg">Log a trade</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filters.strategy} onChange={(e) => filters.setStrategy(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
          <option value="All">All strategies</option>
          {strategies.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(["all", "win", "loss"] as const).map((o) => (
          <button
            key={o}
            onClick={() => filters.setOutcome(o)}
            className={`rounded-full border px-3 py-1 text-sm ${filters.outcome === o ? "border-amber bg-amber-soft text-amber" : "border-line text-muted"}`}
          >
            {o === "all" ? "All" : o === "win" ? "Winners" : "Losers"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {trades.map((t) => (
          <li key={t.id}>
            <Link href={`/journal/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-raised">
              <RBadge outcome={t.outcome} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <span className={t.side === "long" ? "text-win" : "text-loss"}>{t.side === "long" ? "Long" : "Short"}</span> {t.strategy}
                </p>
                <p className="text-sm text-muted">
                  {dateTime(t.entryTime)}, {price(t.entryPrice)} to {price(t.exitPrice)}
                </p>
              </div>
              {(t.hasImage || t.imageUrl) && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 16 5-5 4 4 3-3 6 6" />
                </svg>
              )}
            </Link>
          </li>
        ))}
        {!loading && !trades.length && (
          <li className="p-5 text-sm text-muted">
            No trades yet. <Link href="/journal/new" className="text-amber">Log one</Link> or <Link href="/import" className="text-amber">import your Notion log</Link>.
          </li>
        )}
      </ul>
    </div>
  );
}
