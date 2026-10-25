"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import NewsList from "@/components/NewsList";
import RBadge from "@/components/RBadge";
import TradeForm from "@/components/TradeForm";
import { Notice, SectionTitle } from "@/components/ui";
import { useTrade } from "@/hooks/useTrade";
import { useTrades } from "@/hooks/useTrades";
import { dateTime, price, relativeToEntry } from "@/lib/format";
import { hasFeatures, rOf, RISK_USD } from "@/lib/trading";

const trendTone = (v: string) =>
  v === "up" || v === "green" ? "text-win" : "text-loss";

export default function TradePage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const t = useTrade(id);
  const { strategies } = useTrades();
  const [editing, setEditing] = useState(false);

  if (t.loading) return <p className="text-muted">Loading…</p>;
  if (!t.trade)
    return <p className="text-loss">{t.error || "Trade not found."}</p>;
  const trade = t.trade;
  const f = hasFeatures(trade) ? trade.features! : null;

  const save = async () => {
    if (await t.save()) setEditing(false);
  };

  const remove = async () => {
    if (!confirm("Delete this trade? This can't be undone.")) return;
    await t.remove();
    router.push("/journal");
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight">Edit trade</h1>
        <TradeForm
          draft={t.draft}
          update={t.update}
          strategies={strategies}
          image={t.image}
          setImage={t.setImage}
          imageSrc={t.imageSrc}
          onRemoveImage={t.removeImage}
        />
        {t.error && <p className="text-sm text-loss">{t.error}</p>}
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={t.saving}
            className="btn-primary flex-1 py-3 sm:flex-none sm:px-8"
          >
            {t.saving ? "Saving…" : "Save changes"}
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const move = trade.exitPrice
    ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) *
      (trade.side === "long" ? 100 : -100)
    : null;
  const usd = rOf(trade.outcome) * RISK_USD;
  const facts = [
    ["Entry", price(trade.entryPrice)],
    ["Exit", price(trade.exitPrice)],
    [
      "Price move",
      move == null ? "–" : `${move > 0 ? "+" : ""}${move.toFixed(2)}%`,
    ],
    ["Result", `${usd >= 0 ? "+" : "−"}$${Math.abs(usd)}`],
  ];
  const market = f
    ? [
        ["Session", f.session, ""],
        ["RSI (15m)", f.rsi15.toFixed(0), ""],
        ["1h trend", f.trend1h === "up" ? "Up" : "Down", trendTone(f.trend1h)],
        ["4h trend", f.trend4h === "up" ? "Up" : "Down", trendTone(f.trend4h)],
        ["Volatility (ATR)", `${(f.atrPct * 100).toFixed(2)}%`, ""],
        [
          "Volume",
          `${f.volumeRatio.toFixed(1)}× avg`,
          f.volumeRatio > 1.5 ? "text-news" : "",
        ],
        [
          "Signal candle",
          f.signalCandle === "green" ? "Green" : "Red",
          trendTone(f.signalCandle),
        ],
        ["Day", f.weekday, ""],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/journal"
        className="flex items-center gap-1 self-start text-sm font-semibold text-muted hover:text-text"
      >
        <Icon name="back" className="h-4 w-4" /> Journal
      </Link>

      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${trade.side === "long" ? "bg-win-soft text-win" : "bg-loss-soft text-loss"}`}
        >
          <Icon
            name={trade.side === "long" ? "arrowUp" : "arrowDown"}
            className="h-6 w-6"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {trade.side === "long" ? "Long" : "Short"} · {trade.strategy}
          </h1>
          <p className="text-muted">{dateTime(trade.entryTime)}</p>
        </div>
        <RBadge outcome={trade.outcome} large />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {t.imageSrc ? (
            <a
              href={t.imageSrc}
              target="_blank"
              rel="noreferrer"
              className="card overflow-hidden p-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.imageSrc}
                alt="Trade screenshot"
                className="w-full rounded-2xl"
              />
            </a>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="card flex flex-col items-center gap-2 p-8 text-sm text-muted hover:text-brand"
            >
              <Icon name="image" className="h-6 w-6" />
              {trade.imageRef
                ? "The Notion screenshot wasn't in the upload. Add it here."
                : "Add a chart screenshot"}
            </button>
          )}
          <div className="card p-5">
            <p className="text-sm font-semibold text-muted">Notes</p>
            <p className="mt-2 whitespace-pre-line leading-relaxed">
              {trade.notes || "No notes for this trade."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionTitle title="Market at entry" />
            {f ? (
              <>
                {!f.entryInRange && (
                  <Notice>
                    The entry price isn&apos;t inside this 15m candle&apos;s
                    range, so the time or timezone may be off.
                  </Notice>
                )}
                <div className="card grid grid-cols-2 divide-line overflow-hidden">
                  {market.map(([label, value, tone], i) => (
                    <div
                      key={label}
                      className={`p-4 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line" : ""}`}
                    >
                      <p className="text-xs text-muted">{label}</p>
                      <p className={`mt-0.5 font-bold ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="card p-5 text-sm text-muted">
                {trade.features ? (
                  "Price history couldn't be loaded for this trade."
                ) : (
                  <>
                    Not analysed yet. Open{" "}
                    <Link href="/insights" className="font-semibold text-brand">
                      Insights
                    </Link>{" "}
                    to pull the candles.
                  </>
                )}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle title="News around this trade" />
            {t.events.map((e) => (
              <div
                key={e.name + e.at}
                className={`flex items-center gap-3 rounded-2xl p-4 ${e.impact === "high" ? "bg-loss-soft" : "bg-news-soft"}`}
              >
                <Icon
                  name="bolt"
                  className={`h-5 w-5 shrink-0 ${e.impact === "high" ? "text-loss" : "text-news"}`}
                />
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-sm text-muted">
                    Released {relativeToEntry(e.at, trade.entryTime)},{" "}
                    {e.impact} impact
                  </p>
                </div>
              </div>
            ))}
            {t.news.length ? (
              <NewsList articles={t.news} compact entryTime={trade.entryTime} />
            ) : (
              <p className="card p-5 text-sm text-muted">
                {trade.newsContext ? (
                  "No crypto headlines found in the 3 hours before entry."
                ) : (
                  <>
                    Not matched to news yet. Open{" "}
                    <Link href="/insights" className="font-semibold text-brand">
                      Insights
                    </Link>{" "}
                    and choose Match news.
                  </>
                )}
              </p>
            )}
          </section>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setEditing(true)} className="btn-primary">
          Edit trade
        </button>
        <button onClick={remove} className="btn-ghost text-loss">
          Delete
        </button>
      </div>
    </div>
  );
}
