"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import RBadge from "@/components/RBadge";
import TradeForm from "@/components/TradeForm";
import { useTrade } from "@/hooks/useTrade";
import { useTrades } from "@/hooks/useTrades";
import { dateTime, price, timeAgo } from "@/lib/format";
import { hasFeatures } from "@/lib/trading";

export default function TradePage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const t = useTrade(id);
  const { strategies } = useTrades();
  const [editing, setEditing] = useState(false);

  if (t.loading) return <p className="text-muted">Loading…</p>;
  if (!t.trade) return <p className="text-loss">{t.error || "Trade not found."}</p>;
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
        <h1 className="text-2xl font-semibold">Edit trade</h1>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <TradeForm draft={t.draft} update={t.update} strategies={strategies} image={t.image} setImage={t.setImage} imageSrc={t.imageSrc} onRemoveImage={t.removeImage} />
        </div>
        {t.error && <p className="text-sm text-loss">{t.error}</p>}
        <div className="flex gap-3">
          <button onClick={save} disabled={t.saving} className="flex-1 rounded-xl bg-amber py-3 font-medium text-bg disabled:opacity-60">
            {t.saving ? "Saving…" : "Save changes"}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-xl border border-line px-5">Cancel</button>
        </div>
      </div>
    );
  }

  const chips = f
    ? [
        ["Session", f.session],
        ["RSI 15m", f.rsi15.toFixed(0)],
        ["1h trend", f.trend1h],
        ["4h trend", f.trend4h],
        ["ATR", `${(f.atrPct * 100).toFixed(2)}%`],
        ["Volume", `${f.volumeRatio.toFixed(1)}× avg`],
        ["Signal candle", f.signalCandle],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/journal" className="text-sm text-muted">Back to journal</Link>
      <div className="flex items-start gap-3">
        <RBadge outcome={trade.outcome} />
        <div className="flex-1">
          <h1 className="text-xl font-semibold leading-tight">
            <span className={trade.side === "long" ? "text-win" : "text-loss"}>{trade.side === "long" ? "Long" : "Short"}</span> {trade.strategy}
          </h1>
          <p className="text-sm text-muted">{dateTime(trade.entryTime)}</p>
        </div>
        <button onClick={() => setEditing(true)} className="rounded-lg border border-line px-3 py-1.5 text-sm">Edit</button>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        <div className="bg-panel p-4"><dt className="text-sm text-muted">Entry</dt><dd className="text-lg font-semibold">{price(trade.entryPrice)}</dd></div>
        <div className="bg-panel p-4"><dt className="text-sm text-muted">Exit</dt><dd className="text-lg font-semibold">{price(trade.exitPrice)}</dd></div>
      </dl>

      {t.imageSrc && (
        <a href={t.imageSrc} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.imageSrc} alt="Trade screenshot" className="w-full rounded-2xl border border-line" />
        </a>
      )}
      {!t.imageSrc && trade.imageRef && <p className="text-sm text-muted">Screenshot from Notion not attached ({trade.imageRef}). Add it with Edit.</p>}

      {trade.notes && <p className="whitespace-pre-line rounded-2xl border border-line bg-panel p-4 leading-relaxed">{trade.notes}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Market at entry</h2>
        {f ? (
          <>
            {!f.entryInRange && (
              <p className="rounded-lg bg-amber-soft p-3 text-sm text-amber">
                The entry price isn&apos;t inside this 15m candle&apos;s range. The time or timezone may be off.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {chips.map(([label, value]) => (
                <span key={label} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
                  <span className="text-muted">{label}</span> {value}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            {trade.features ? "Price history couldn't be loaded for this trade." : <>Not analysed yet. Open <Link href="/insights" className="text-amber">Insights</Link> to pull the candles.</>}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">News in the 3 hours before entry</h2>
        {t.news.length ? (
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-panel">
            {t.news.map((n) => (
              <li key={n.id} className="p-3 text-sm">
                <a href={n.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">{n.title}</a>
                <p className="text-muted">{n.impactLevel} impact, {n.sentiment.toLowerCase()}, {timeAgo(n.publishedAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No saved headlines from that window. News is only stored from the day the app started fetching it.</p>
        )}
      </section>

      <button onClick={remove} className="self-start text-sm text-loss">Delete trade</button>
    </div>
  );
}
