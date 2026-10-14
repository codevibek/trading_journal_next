"use client";

import { useState } from "react";
import { useBriefing, VOICES } from "@/hooks/useBriefing";
import { useNews, type Article } from "@/hooks/useNews";
import { timeAgo } from "@/lib/format";

const LEVEL_BAR = { High: "bg-loss", Medium: "bg-amber", Low: "bg-line" };
const SENTIMENT = { Positive: "text-win", Negative: "text-loss", Neutral: "text-muted" };

export default function BriefingPage() {
  const news = useNews();
  const briefing = useBriefing();
  const [showSettings, setShowSettings] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const s = briefing.settings;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {news.loading ? "Loading the news…" : `${news.highCount} high-impact ${news.highCount === 1 ? "story" : "stories"} in the last 24 hours`}
        </h1>

        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={briefing.generate}
            disabled={briefing.loading || !s}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber px-4 py-3.5 font-medium text-bg disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            {briefing.loading ? "Recording your briefing…" : briefing.audioUrl ? "Record again" : "Play morning briefing"}
          </button>
          {briefing.audioUrl && <audio src={briefing.audioUrl} autoPlay controls className="w-full" />}
          {briefing.error && <p className="text-sm text-loss">{briefing.error}</p>}
          <div className="flex gap-4 text-sm text-muted">
            <button onClick={() => setShowSettings(!showSettings)} className="hover:text-text">
              {showSettings ? "Hide settings" : "Briefing settings"}
            </button>
            {briefing.script && (
              <button onClick={() => setShowScript(!showScript)} className="hover:text-text">
                {showScript ? "Hide script" : "Read the script"}
              </button>
            )}
          </div>
        </div>

        {showSettings && s && (
          <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">Stories: {s.items}</span>
              <input type="range" min={3} max={20} value={s.items} onChange={(e) => briefing.updateSettings({ items: +e.target.value })} className="accent-amber" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">Minimum impact: {s.minImpact}</span>
              <input type="range" min={0} max={80} step={5} value={s.minImpact} onChange={(e) => briefing.updateSettings({ minImpact: +e.target.value })} className="accent-amber" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">Voice</span>
              <select value={s.voice} onChange={(e) => briefing.updateSettings({ voice: e.target.value })} className="rounded-lg border border-line bg-raised px-2 py-2">
                {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">Speed: {s.rate > 0 ? "+" : ""}{s.rate}%</span>
              <input type="range" min={-20} max={40} step={10} value={s.rate} onChange={(e) => briefing.updateSettings({ rate: +e.target.value })} className="accent-amber" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={s.summaries} onChange={(e) => briefing.updateSettings({ summaries: e.target.checked })} className="accent-amber" />
              Read summaries too
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={s.cryptoOnly} onChange={(e) => briefing.updateSettings({ cryptoOnly: e.target.checked })} className="accent-amber" />
              Crypto stories only
            </label>
            <p className="text-muted sm:col-span-2">The 6am scheduled run records the briefing with these settings, so it plays instantly in the morning.</p>
          </div>
        )}

        {showScript && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed text-muted">{briefing.script}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Medium", "High"] as const).map((l) => (
            <button
              key={l}
              onClick={() => news.filters.setLevel(l)}
              className={`rounded-full border px-3 py-1 text-sm ${news.filters.level === l ? "border-amber bg-amber-soft text-amber" : "border-line text-muted"}`}
            >
              {l === "All" ? "All" : l === "Medium" ? "Medium and up" : "High only"}
            </button>
          ))}
          <button
            onClick={() => news.filters.setCryptoOnly(!news.filters.cryptoOnly)}
            className={`rounded-full border px-3 py-1 text-sm ${news.filters.cryptoOnly ? "border-amber bg-amber-soft text-amber" : "border-line text-muted"}`}
          >
            Crypto
          </button>
          <button onClick={news.refresh} disabled={news.refreshing} className="ml-auto text-sm text-muted hover:text-text disabled:opacity-60">
            {news.refreshing ? "Fetching…" : news.lastFetchedAt ? `Updated ${timeAgo(news.lastFetchedAt)}` : "Fetch news"}
          </button>
        </div>
        <input
          value={news.filters.search}
          onChange={(e) => news.filters.setSearch(e.target.value)}
          placeholder="Search headlines"
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        />
        {news.error && <p className="text-sm text-loss">{news.error}</p>}
        {news.failedFeeds.length > 0 && <p className="text-xs text-muted">Couldn&apos;t reach: {news.failedFeeds.join(", ")}</p>}

        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {news.articles.map((a) => <NewsRow key={a.id} a={a} />)}
          {!news.loading && !news.articles.length && (
            <li className="p-5 text-sm text-muted">
              {news.total ? "Nothing matches these filters." : "No news saved yet. Use Fetch news to pull the latest headlines."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function NewsRow({ a }: { a: Article }) {
  return (
    <li className="flex gap-3 p-4">
      <span className={`w-1 shrink-0 rounded-full ${LEVEL_BAR[a.impactLevel]}`} title={`${a.impactLevel} impact`} />
      <div className="min-w-0 flex-1">
        <a href={a.link} target="_blank" rel="noreferrer" className="font-medium leading-snug hover:underline">
          {a.title}
        </a>
        {a.summary && a.summary !== a.title && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.summary}</p>}
        <p className="mt-1.5 text-xs text-muted">
          {a.source.replace(/_/g, " ")}, {timeAgo(a.publishedAt)}
          <span className={`ml-2 ${SENTIMENT[a.sentiment]}`}>{a.sentiment}</span>
        </p>
      </div>
      <span className="shrink-0 text-right text-sm font-semibold">{Math.round(a.impactScore)}</span>
    </li>
  );
}
