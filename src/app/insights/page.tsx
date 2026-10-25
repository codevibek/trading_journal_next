"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Empty, Notice, PageHeader, StatCard } from "@/components/ui";
import { useInsights, type Bucket } from "@/hooks/useInsights";
import { pct, rMultiple } from "@/lib/format";
import { BREAKEVEN_WIN_RATE } from "@/lib/trading";
import NewsMatchCard from "@/components/NewsMatchCard";

const DOT = {
  edge: "bg-win",
  leak: "bg-loss",
  unclear: "bg-text",
  few: "bg-muted",
};
const RANGE = {
  edge: "bg-win/25",
  leak: "bg-loss/25",
  unclear: "bg-text/15",
  few: "bg-muted/20",
};

function BucketRow({ b }: { b: Bucket }) {
  return (
    <li
      className={`grid grid-cols-[minmax(0,6.5rem)_1fr_3.75rem] items-center gap-3 py-3 text-sm sm:grid-cols-[minmax(0,9rem)_1fr_4rem] ${b.verdict === "few" ? "opacity-55" : ""}`}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold">{b.label}</span>
        <span className="text-xs text-muted">
          {b.n} trade{b.n === 1 ? "" : "s"}
        </span>
      </span>
      <div
        className="relative h-7"
        title={`Likely between ${pct(b.low)} and ${pct(b.high)}`}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-raised" />
        <div
          className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${RANGE[b.verdict]}`}
          style={{
            left: `${b.low * 100}%`,
            width: `${(b.high - b.low) * 100}%`,
          }}
        />
        <div
          className="absolute inset-y-0 w-0.5 rounded-full bg-news"
          style={{ left: `${BREAKEVEN_WIN_RATE * 100}%` }}
        />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel ${DOT[b.verdict]}`}
          style={{ left: `${b.winRate * 100}%` }}
        />
      </div>
      <span className="text-right">
        <span className="block font-bold">{pct(b.winRate)}</span>
        <span
          className={`text-xs font-semibold ${b.expR > 0 ? "text-win" : b.expR < 0 ? "text-loss" : "text-muted"}`}
        >
          {rMultiple(b.expR)}
        </span>
      </span>
    </li>
  );
}

function Highlight({
  title,
  tone,
  items,
  empty,
}: {
  title: string;
  tone: "win" | "loss";
  items: (Bucket & { dimension: string })[];
  empty: string;
}) {
  return (
    <section
      className={`rounded-[1.25rem] p-5 ${tone === "win" ? "bg-win-soft" : "bg-loss-soft"}`}
    >
      <h2 className={`font-bold ${tone === "win" ? "text-win" : "text-loss"}`}>
        {title}
      </h2>
      {items.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((b) => (
            <li
              key={b.dimension + b.label}
              className="flex items-center justify-between gap-3 rounded-xl bg-panel px-3.5 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{b.label}</span>
                <span className="text-xs text-muted">
                  {b.dimension}, {b.n} trades
                </span>
              </span>
              <span className="text-right">
                <span
                  className={`block font-bold ${tone === "win" ? "text-win" : "text-loss"}`}
                >
                  {rMultiple(b.expR)}
                </span>
                <span className="text-xs text-muted">{pct(b.winRate)} won</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

export default function InsightsPage() {
  const ins = useInsights();
  const o = ins.overall;

  if (ins.loading) return <p className="text-muted">Loading…</p>;

  if (!o.n) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Insights" />
        <Empty icon="insights" title="Nothing to analyse yet">
          <div className="mt-2 flex justify-center gap-2">
            <Link href="/import" className="btn-ghost">
              Import from Notion
            </Link>
            <Link href="/journal/new" className="btn-primary">
              Log a trade
            </Link>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        subtitle="What the market looked like when you won and when you lost"
        action={
          <select
            value={ins.strategy}
            onChange={(e) => ins.setStrategy(e.target.value)}
            className="field w-auto py-2 text-sm font-semibold"
          >
            <option value="All">All strategies</option>
            {ins.strategies.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="trophy"
          tone={o.winRate >= BREAKEVEN_WIN_RATE ? "win" : "loss"}
          label="Win rate"
          value={pct(o.winRate)}
          sub={`Break-even is ${pct(BREAKEVEN_WIN_RATE, 1)}`}
        />
        <StatCard
          icon="chart"
          tone="violet"
          label="Average per trade"
          value={rMultiple(o.expR)}
          sub={`${o.totalUsd >= 0 ? "+" : "−"}$${Math.abs(Math.round(o.totalUsd)).toLocaleString()} in total`}
        />
        <StatCard
          icon="list"
          tone="sky"
          label="Trades"
          value={o.n}
          sub={`${ins.analysed} with market data`}
        />
        <StatCard
          icon="bolt"
          tone="news"
          label="Patterns to check"
          value={ins.highlights.best.length + ins.highlights.worst.length}
          sub="Groups of 10+ trades"
        />
      </div>

      {ins.progress && (
        <div className="card flex flex-col gap-2 p-4 text-sm">
          <span className="font-semibold">
            Pulling BTC candles for each trade: {ins.progress.done} of{" "}
            {ins.progress.total}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{
                width: `${(ins.progress.done / Math.max(ins.progress.total, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {ins.error && (
        <Notice tone="loss">
          {ins.error}{" "}
          <button
            onClick={() => ins.analyse()}
            className="font-semibold underline"
          >
            Try again
          </button>
        </Notice>
      )}
      {ins.offCandle > 0 && (
        <Notice>
          {ins.offCandle === 1 ? "1 trade has" : `${ins.offCandle} trades have`}{" "}
          an entry price outside its 15m candle. If that&apos;s most of them,
          the import timezone is probably wrong.
        </Notice>
      )}
      <NewsMatchCard onChange={ins.reload} />
      <div className="grid gap-4 md:grid-cols-2">
        <Highlight
          title="What's working"
          tone="win"
          items={ins.highlights.best}
          empty="No group of 10+ trades is clearly profitable yet."
        />
        <Highlight
          title="What's costing you"
          tone="loss"
          items={ins.highlights.worst}
          empty="No group of 10+ trades is losing money."
        />
      </div>

      <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-win" /> Clearly above
          break-even
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-loss" /> Clearly below
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-text" /> Not clear yet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-news" /> Break-even win rate
        </span>
        <span>
          The bar around each dot is the range the true win rate probably sits
          in.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ins.dimensions.map((d) => (
          <section key={d.title} className="card px-5 py-4">
            <h2 className="font-bold">{d.title}</h2>
            {d.hint && <p className="text-sm text-muted">{d.hint}</p>}
            <ul className="mt-1 divide-y divide-line">
              {d.buckets.map((b) => (
                <BucketRow key={b.label} b={b} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="/api/export" className="btn-ghost">
          <Icon name="download" className="h-4 w-4" /> Download data for Python
        </a>
        <button
          onClick={() => ins.analyse(true)}
          disabled={!!ins.progress}
          className="btn-ghost"
        >
          <Icon name="refresh" className="h-4 w-4" /> Re-analyse all trades
        </button>
      </div>
      <p className="text-xs text-muted">
        Patterns from a few dozen trades are often noise. Treat these as ideas
        to test, not rules.
      </p>
    </div>
  );
}
