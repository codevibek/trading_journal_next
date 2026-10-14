"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import PriceChart from "@/components/charts/PriceChart";
import Icon from "@/components/Icon";
import NewsList from "@/components/NewsList";
import { fmtPrice, ScoreMeter, VerdictBadge } from "@/components/signals";
import { SectionTitle } from "@/components/ui";
import { useSignal } from "@/hooks/useSignal";
import { KIND_LABEL, TIMEFRAMES } from "@/lib/instruments";
import { REWARD_R, RISK_USD } from "@/lib/trading";

const toneText = { bull: "text-win", bear: "text-loss", neutral: "text-muted" };

export default function SignalPage() {
  const id = useParams<{ id: string }>().id;
  const d = useSignal(id);
  const s = d.signal;

  const back = (
    <Link href="/signals" className="flex items-center gap-1 self-start text-sm font-semibold text-muted hover:text-text">
      <Icon name="back" className="h-4 w-4" /> Signals
    </Link>
  );

  if (!s) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className={d.error ? "text-loss" : "text-muted"}>{d.error || "Loading prices…"}</p>
      </div>
    );
  }

  const t = s.technicals;
  const dp = s.decimals;
  const higherLabel = TIMEFRAMES.find((x) => x.id === s.timeframe)!.higher;
  const tech = [
    ["RSI (14)", t.rsi.toFixed(0), t.rsi > 70 ? "Overbought" : t.rsi < 30 ? "Oversold" : t.rsi >= 55 ? "Bullish" : t.rsi <= 45 ? "Bearish" : "Neutral"],
    ["Trend", t.trend === "up" ? "Up" : "Down", "20 vs 50 EMA"],
    [`Trend (${higherLabel})`, t.higherTrend ? (t.higherTrend === "up" ? "Up" : "Down") : "–", "Higher timeframe"],
    ["200 EMA", t.aboveEma200 == null ? "–" : t.aboveEma200 ? "Above" : "Below", "Long-term bias"],
    ["MACD", t.macdHist > 0 ? "Positive" : "Negative", t.macdRising ? "Strengthening" : "Fading"],
    ["ATR (14)", fmtPrice(t.atr, dp), `${((t.atr / s.price) * 100).toFixed(2)}% of price`],
    ["Support", fmtPrice(t.support, dp), "Lowest low, last 50 bars"],
    ["Resistance", fmtPrice(t.resistance, dp), "Highest high, last 50 bars"],
  ];
  const lines = [
    { value: t.resistance, label: "Resistance", color: "var(--muted)" },
    { value: t.support, label: "Support", color: "var(--muted)" },
    ...(s.levels
      ? [
          { value: s.levels.stop, label: "Stop", color: "var(--loss)" },
          { value: s.levels.target, label: "Target", color: "var(--win)" },
        ]
      : []),
  ];
  const units = s.levels ? RISK_USD / Math.abs(s.levels.entry - s.levels.stop) : 0;

  return (
    <div className="flex flex-col gap-6">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{KIND_LABEL[s.kind]} · {d.instrument?.ticker}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.name}</h1>
          <p className="mt-1 text-xl font-bold">
            {fmtPrice(s.price, dp)}{" "}
            <span className={`text-base ${s.change24h >= 0 ? "text-win" : "text-loss"}`}>
              {s.change24h >= 0 ? "+" : ""}
              {(s.change24h * 100).toFixed(2)}% in 24h
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-64">
          <div className="flex items-center justify-between">
            <VerdictBadge verdict={s.verdict} large />
            <span className="text-sm font-semibold text-muted">Score {s.score > 0 ? "+" : ""}{s.score}</span>
          </div>
          <ScoreMeter score={s.score} />
        </div>
      </div>

      <div className="flex rounded-xl bg-panel p-1 ring-1 ring-line self-start">
        {TIMEFRAMES.map((tf) => (
          <button key={tf.id} onClick={() => d.setTimeframe(tf.id)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${d.timeframe === tf.id ? "bg-brand-strong text-white" : "text-muted"}`}>
            {tf.label}
          </button>
        ))}
      </div>

      <section className={`card p-4 sm:p-5 ${d.loading ? "opacity-60" : ""}`}>
        {d.chart && <PriceChart bars={d.chart} lines={lines} decimals={dp} intraday={s.timeframe !== "1d"} />}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle title="Why this call" />
          <ul className="card divide-y divide-line">
            {s.reasons.map((r) => (
              <li key={r.text} className="flex gap-3 p-4">
                <Icon name={r.tone === "bull" ? "arrowUp" : r.tone === "bear" ? "arrowDown" : "list"} className={`mt-0.5 h-5 w-5 shrink-0 ${toneText[r.tone]}`} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          {s.levels ? (
            <section className="flex flex-col gap-3">
              <SectionTitle title="Trade plan at 1:2" />
              <div className="card grid grid-cols-3 divide-x divide-line">
                {[
                  ["Entry", s.levels.entry, ""],
                  ["Stop", s.levels.stop, "text-loss"],
                  ["Target", s.levels.target, "text-win"],
                ].map(([label, v, tone]) => (
                  <div key={label as string} className="p-4">
                    <p className="text-xs text-muted">{label}</p>
                    <p className={`font-bold ${tone}`}>{fmtPrice(v as number, dp)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted">
                Stop is 1.5× ATR away and the target is {REWARD_R}× that. Risking ${RISK_USD} means a size of about {units < 10 ? units.toFixed(4) : Math.round(units).toLocaleString()} units.
              </p>
            </section>
          ) : (
            <section className="card p-5 text-sm text-muted">No trade plan while the signal is neutral. The rules don&apos;t agree strongly enough in either direction.</section>
          )}

          <section className="flex flex-col gap-3">
            <SectionTitle title="Technicals" />
            <div className="card grid grid-cols-2 overflow-hidden">
              {tech.map(([label, value, note], i) => (
                <div key={label} className={`p-4 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line" : ""}`}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="font-bold">{value}</p>
                  <p className="text-xs text-muted">{note}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Related news, last 24 hours" />
        {d.news?.length ? <NewsList articles={d.news} compact /> : <p className="card p-5 text-sm text-muted">No headlines mention {s.name} in the last 24 hours.</p>}
      </section>

      <p className="text-xs text-muted">Signals are rules applied to price and headlines, not financial advice.</p>
    </div>
  );
}
