"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import TradeList from "@/components/TradeList";
import { Empty, PageHeader, Pill, StatCard } from "@/components/ui";
import { useTrades } from "@/hooks/useTrades";
import { pct, rMultiple } from "@/lib/format";
import { BREAKEVEN_WIN_RATE } from "@/lib/trading";

export default function JournalPage() {
  const { trades, all, loading, error, strategies, filters, stats } = useTrades();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Journal"
        subtitle="Every trade with its notes, screenshot and market context"
        action={
          <div className="flex gap-2">
            <Link href="/import" className="btn-ghost"><Icon name="import" className="h-4 w-4" /> Import</Link>
            <Link href="/journal/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Log a trade</Link>
          </div>
        }
      />

      {all.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon="list" tone="sky" label="Trades" value={stats.count} />
            <StatCard icon="trophy" tone={stats.winRate >= BREAKEVEN_WIN_RATE ? "win" : "loss"} label="Win rate" value={pct(stats.winRate)} />
            <StatCard icon="chart" tone="violet" label="Result" value={rMultiple(stats.totalR)} sub={`${stats.totalUsd >= 0 ? "+" : "−"}$${Math.abs(stats.totalUsd).toLocaleString()}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={filters.strategy} onChange={(e) => filters.setStrategy(e.target.value)} className="field w-auto py-1.5 text-sm font-medium">
              <option value="All">All strategies</option>
              {strategies.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Pill active={filters.outcome === "all"} onClick={() => filters.setOutcome("all")}>All</Pill>
            <Pill active={filters.outcome === "win"} onClick={() => filters.setOutcome("win")}>Winners</Pill>
            <Pill active={filters.outcome === "loss"} onClick={() => filters.setOutcome("loss")}>Losers</Pill>
          </div>
        </>
      )}

      {error && <p className="text-sm text-loss">{error}</p>}

      {trades.length > 0 ? (
        <TradeList trades={trades} />
      ) : (
        !loading && (
          <Empty icon="journal" title={all.length ? "No trades match these filters" : "Your journal is empty"}>
            {!all.length && (
              <div className="mt-2 flex justify-center gap-2">
                <Link href="/import" className="btn-ghost">Import from Notion</Link>
                <Link href="/journal/new" className="btn-primary">Log a trade</Link>
              </div>
            )}
          </Empty>
        )
      )}
    </div>
  );
}
