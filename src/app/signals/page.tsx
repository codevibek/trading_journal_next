"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { SignalCard } from "@/components/signals";
import { Empty, PageHeader, Pill, SectionTitle, TONES } from "@/components/ui";
import WatchlistSheet from "@/components/WatchlistSheet";
import { useSignals } from "@/hooks/useSignals";
import { timeAgo } from "@/lib/format";
import { KIND_LABEL, TIMEFRAMES, type Signal } from "@/lib/instruments";

const MOOD = { positive: TONES.win, negative: TONES.loss, mixed: TONES.muted };

function Group({ title, tone, items }: { title: string; tone: string; items: Signal[] }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title={title} action={<span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone}`}>{items.length}</span>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => <SignalCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}

export default function SignalsPage() {
  const sig = useSignals();
  const [editing, setEditing] = useState(false);
  const sum = sig.summary;
  const updated = [...sig.buys, ...sig.sells, ...sig.neutral].map((s) => s.computedAt).sort()[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Signals"
        subtitle="Buy and sell calls from trend, momentum and the news, with the reasons behind each one."
        action={
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-ghost"><Icon name="list" className="h-4 w-4" /> Watchlist</button>
            <button onClick={sig.refresh} disabled={sig.refreshing} className="btn-ghost" aria-label="Refresh signals">
              <Icon name="refresh" className={`h-4 w-4 ${sig.refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {sum && (
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Today&apos;s news in brief</h2>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${MOOD[sum.mood]}`}>Mood: {sum.mood}</span>
          </div>
          <div className="flex flex-col gap-2 leading-relaxed">
            {sum.sentences.map((s) => <p key={s}>{s}</p>)}
          </div>
          {sum.themes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sum.themes.map((t) => (
                <span key={t.name} className={`rounded-full px-3 py-1 text-sm font-medium ${t.tone === "positive" ? TONES.win : t.tone === "negative" ? TONES.loss : TONES.muted}`}>
                  {t.name[0].toUpperCase() + t.name.slice(1)} · {t.count}
                </span>
              ))}
            </div>
          )}
          {sum.top.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
              {sum.top.map((a) => (
                <li key={a.id}>
                  <a href={a.link} target="_blank" rel="noreferrer" className="flex gap-2 hover:underline">
                    <span className={`shrink-0 font-bold ${a.impactLevel === "High" ? "text-loss" : "text-news"}`}>{Math.round(a.impactScore)}</span>
                    <span>{a.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-panel p-1 ring-1 ring-line">
          {TIMEFRAMES.map((t) => (
            <button key={t.id} onClick={() => sig.setTimeframe(t.id)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sig.timeframe === t.id ? "bg-brand-strong text-white" : "text-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Pill active={sig.kind === "all"} onClick={() => sig.setKind("all")}>All</Pill>
        {sig.kinds.map((k) => (
          <Pill key={k} active={sig.kind === k} onClick={() => sig.setKind(k)}>{KIND_LABEL[k]}</Pill>
        ))}
      </div>

      {sig.error && <p className="text-sm text-loss">{sig.error}</p>}
      {sig.loading ? (
        <p className="text-muted">Pulling prices and scoring your watchlist…</p>
      ) : (
        <>
          <Group title="Buy signals" tone={TONES.win} items={sig.buys} />
          <Group title="Sell signals" tone={TONES.loss} items={sig.sells} />
          <Group title="No clear signal" tone={TONES.muted} items={sig.neutral} />
          {!sig.buys.length && !sig.sells.length && !sig.neutral.length && <Empty icon="chart" title="No signals to show">Add instruments with Watchlist, or check your connection.</Empty>}
          {sig.failed.length > 0 && <p className="text-sm text-muted">Couldn&apos;t load: {sig.failed.map((f) => `${f.name} (${f.error})`).join(", ")}</p>}
        </>
      )}

      <p className="text-xs text-muted">
        {updated && `Prices as of ${timeAgo(updated)}, refreshed every 15 minutes. `}Signals are rules applied to price and headlines, not financial advice. Check the chart before acting on one.
      </p>

      {editing && <WatchlistSheet onClose={() => setEditing(false)} onSaved={sig.reload} />}
    </div>
  );
}
