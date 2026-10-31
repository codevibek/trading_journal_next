"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Empty, PageHeader, Pill, TONES } from "@/components/ui";
import { useExchangeNews, type CompanyNews, type Reaction } from "@/hooks/useExchangeNews";
import { dateTime, timeAgo } from "@/lib/format";

const COPY = {
  asx: {
    title: "ASX announcements",
    source: "Official ASX company announcements. Price-sensitive ones are flagged by the company under ASX listing rules.",
  },
  us: {
    title: "US company filings",
    source: "Official SEC 8-K filings from companies with a listed ticker. The event type comes from the filing's item codes.",
  },
};

const IMPACT = { High: TONES.loss, Medium: TONES.news, Low: TONES.muted };

function ReactionBadge({ r }: { r: Reaction | null }) {
  if (!r || r.status === "pending") return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.muted}`}>Waiting for the market</span>;
  if (r.status === "unknown") return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.muted}`}>No price data</span>;
  const up = (r.change ?? 0) >= 0;
  const tone = r.status === "confirmed" ? (up ? TONES.win : TONES.loss) : TONES.muted;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {r.status === "confirmed" ? "Confirmed" : "Muted"} · {up ? "+" : ""}
      {r.change?.toFixed(1)}%{r.volumeRatio ? ` · ${r.volumeRatio}× vol` : ""}
      {r.live ? " · live" : ""}
    </span>
  );
}

function Row({ i, market }: { i: CompanyNews; market: "asx" | "us" }) {
  const chart = market === "asx" ? `https://finance.yahoo.com/quote/${i.ticker}.AX` : `https://finance.yahoo.com/quote/${i.ticker}`;
  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={chart} target="_blank" rel="noreferrer" className="rounded-lg bg-text px-2 py-0.5 text-sm font-bold text-bg">{i.ticker}</a>
        <span className="min-w-0 truncate font-medium">{i.company ?? ""}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${IMPACT[i.impact]}`}>{i.impact}</span>
      </div>
      <a href={i.url} target="_blank" rel="noreferrer" className="leading-snug font-semibold hover:text-brand">{i.title}</a>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {i.category !== i.title && <span>{i.category}</span>}
        {market === "asx" && i.priceSensitive && <span className="font-semibold text-loss">Price sensitive</span>}
        <span>· {dateTime(i.publishedAt)}</span>
        <span className="ml-auto"><ReactionBadge r={i.reaction} /></span>
      </div>
    </li>
  );
}

export default function ExchangeNews({ market }: { market: "asx" | "us" }) {
  const n = useExchangeNews(market);
  const f = n.filters;
  const b = n.briefing;
  const [scriptOpen, setScriptOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={COPY[market].title}
        subtitle={n.lastRefresh ? `Latest trading day, checked ${timeAgo(n.lastRefresh.at)}` : "Latest trading day"}
        action={
          <button onClick={n.refresh} disabled={n.refreshing} className="btn-ghost">
            <Icon name="refresh" className={`h-4 w-4 ${n.refreshing ? "animate-spin" : ""}`} />
            {n.refreshing ? "Checking…" : "Fetch latest"}
          </button>
        }
      />

      <section className="flex flex-col gap-3 rounded-[1.25rem] bg-brand-strong p-5 text-white">
        <p className="text-lg font-bold">
          {n.total ? `${n.high} high impact, ${n.confirmed} confirmed by the market, out of ${n.total}` : "Nothing saved yet"}
        </p>
        {b.audioUrl ? (
          <audio src={b.audioUrl} autoPlay controls className="w-full" />
        ) : (
          <button onClick={b.listen} disabled={b.recording || !n.total} className="flex items-center gap-2 self-start rounded-xl bg-white px-5 py-3 font-semibold text-brand-strong">
            <Icon name="play" fill className="h-5 w-5" />
            {b.recording ? "Recording…" : "Listen now"}
          </button>
        )}
        {b.script && (
          <button onClick={() => setScriptOpen(!scriptOpen)} className="self-start text-sm text-white/80 hover:underline">
            {scriptOpen ? "Hide the script" : "Read the script instead"}
          </button>
        )}
        {scriptOpen && <p className="rounded-xl bg-white/10 p-4 text-sm leading-relaxed whitespace-pre-line">{b.script}</p>}
      </section>

      <div className="flex flex-col gap-3">
        <label className="relative">
          <Icon name="search" className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Search ticker, company or headline" className="field pl-10" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Pill active={f.filter === "all"} onClick={() => f.setFilter("all")}>Everything</Pill>
          <Pill active={f.filter === "high"} onClick={() => f.setFilter("high")}>High only</Pill>
          <Pill active={f.filter === "confirmed"} onClick={() => f.setFilter("confirmed")}>Market confirmed</Pill>
          <Pill active={f.all} onClick={() => f.setAll(!f.all)}>Include low impact</Pill>
        </div>
      </div>

      {n.error && <p className="text-sm text-loss">{n.error}</p>}

      {n.items.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">{n.items.map((i) => <Row key={i.id} i={i} market={market} />)}</ul>
      ) : (
        !n.loading && (
          <Empty icon="news" title={n.total ? "Nothing matches these filters" : n.refreshing ? "Fetching announcements…" : "No announcements saved yet"}>
            {n.total ? "Try a broader filter." : "Use Fetch latest to pull them."}
          </Empty>
        )
      )}

      <p className="text-xs text-muted">
        {COPY[market].source} <b>Confirmed</b> means the stock moved at least 2× its usual daily move (and 2.5% or more) or traded 2× its normal volume in the first
        session after the news. <b>Muted</b> means it didn&apos;t.
      </p>
    </div>
  );
}
