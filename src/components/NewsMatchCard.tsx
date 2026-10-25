"use client";

import { useNewsMatch } from "@/hooks/useNewsMatch";
import Icon from "./Icon";
import { Notice } from "./ui";

export default function NewsMatchCard({ onChange }: { onChange: () => void }) {
  const { status: s, progress, error, run } = useNewsMatch(onChange);
  if (!s || !s.total) return null;

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">News at the time of your trades</h2>
          <p className="text-sm text-muted">
            Headlines from the 3 hours before each entry, and scheduled US data released within 2 hours either side.
          </p>
        </div>
        {!progress && (
          <button onClick={() => run(s.pending === 0)} className={s.pending ? "btn-primary" : "btn-ghost"}>
            <Icon name="news" className="h-4 w-4" />
            {s.pending ? `Match news to ${s.pending} trades` : "Match again"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-raised p-3">
          <p className="text-xl font-bold">{s.matched}<span className="text-sm font-medium text-muted"> / {s.total}</span></p>
          <p className="text-muted">trades checked</p>
        </div>
        <div className="rounded-xl bg-raised p-3">
          <p className="text-xl font-bold">{s.withHeadlines}</p>
          <p className="text-muted">had crypto headlines</p>
        </div>
        <div className="rounded-xl bg-raised p-3">
          <p className="text-xl font-bold">{s.macroConfigured ? s.withEvent : "–"}</p>
          <p className="text-muted">near a US data release</p>
        </div>
      </div>

      {progress && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">
            Searching the news archive: {progress.done} of {progress.total} trades. Older trades take about 5 seconds each.
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
        </div>
      )}
      {error && <Notice tone="loss">{error} Matching stopped partway; run it again to continue.</Notice>}
      {!s.macroConfigured && (
        <Notice tone="sky">
          Add a free <b>FRED_API_KEY</b> to include CPI, jobs report and Fed decision times. Get one at fred.stlouisfed.org (My Account → API Keys), add it to
          .env.local and to Vercel, then choose Match again.
        </Notice>
      )}
      {s.macroConfigured && s.macroInfo?.missing?.length ? (
        <p className="text-xs text-muted">Not found in FRED: {s.macroInfo.missing.join(", ")}.</p>
      ) : null}
    </section>
  );
}
