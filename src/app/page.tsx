"use client";

import Link from "next/link";
import BriefingCard from "@/components/BriefingCard";
import EquityCurve from "@/components/charts/EquityCurve";
import Icon from "@/components/Icon";
import NewsList from "@/components/NewsList";
import TradeList from "@/components/TradeList";
import { SectionTitle, StatCard } from "@/components/ui";
import { useNews } from "@/hooks/useNews";
import { useTrades } from "@/hooks/useTrades";
import { pct, rMultiple, timeAgo } from "@/lib/format";
import { BREAKEVEN_WIN_RATE } from "@/lib/trading";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const money = (n: number) => `${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString()}`;

export default function HomePage() {
  const news = useNews();
  const t = useTrades();
  const hasTrades = t.all.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}</h1>
      </div>

      <BriefingCard highCount={news.highCount} total={news.total} />

      {hasTrades ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon="trophy"
              tone={t.stats.winRate >= BREAKEVEN_WIN_RATE ? "win" : "loss"}
              label="Win rate"
              value={pct(t.stats.winRate)}
              sub={`Break-even is ${pct(BREAKEVEN_WIN_RATE)}`}
            />
            <StatCard icon="chart" tone="violet" label="Total result" value={rMultiple(t.stats.totalR)} sub={money(t.stats.totalUsd)} />
            <StatCard icon="list" tone="sky" label="Trades this month" value={t.thisMonth.count} sub={`${rMultiple(t.thisMonth.r)} so far`} />
            <StatCard icon="bolt" tone="news" label="High-impact news today" value={news.highCount} sub={news.lastFetchedAt ? `Updated ${timeAgo(news.lastFetchedAt)}` : "Not fetched yet"} />
          </div>

          <section className="card p-4 sm:p-5">
            <SectionTitle title="Equity curve" action={<span className="text-sm text-muted">Cumulative R, all trades</span>} />
            <div className="mt-3">
              <EquityCurve points={t.equity} />
            </div>
          </section>
        </>
      ) : (
        !t.loading && (
          <section className="card p-5">
            <SectionTitle title="Get your journal going" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/import" className="flex gap-3 rounded-2xl bg-violet-soft p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet text-white"><Icon name="import" /></span>
                <span>
                  <span className="block font-semibold">Import from Notion</span>
                  <span className="text-sm text-muted">Bring in your existing log and screenshots</span>
                </span>
              </Link>
              <Link href="/journal/new" className="flex gap-3 rounded-2xl bg-sky-soft p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky text-white"><Icon name="plus" /></span>
                <span>
                  <span className="block font-semibold">Log a trade</span>
                  <span className="text-sm text-muted">Record today&apos;s trade with a chart screenshot</span>
                </span>
              </Link>
            </div>
          </section>
        )
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        {hasTrades && (
          <section className="flex flex-col gap-3">
            <SectionTitle title="Recent trades" action={<Link href="/journal" className="text-sm font-semibold text-brand">See all</Link>} />
            <TradeList trades={t.all.slice(0, 5)} />
          </section>
        )}
        <section className={`flex flex-col gap-3 ${hasTrades ? "" : "lg:col-span-2"}`}>
          <SectionTitle title="Top headlines" action={<Link href="/news" className="text-sm font-semibold text-brand">See all</Link>} />
          {news.articles.length ? (
            <NewsList articles={news.articles.slice(0, 5)} compact />
          ) : (
            <p className="card p-5 text-sm text-muted">{news.refreshing || news.loading ? "Fetching the latest headlines…" : "No headlines yet. Open News and fetch the latest."}</p>
          )}
        </section>
      </div>
    </div>
  );
}
