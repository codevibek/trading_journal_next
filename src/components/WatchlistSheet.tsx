"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import { KIND_LABEL, type Kind } from "@/lib/instruments";
import Icon from "./Icon";

const EXAMPLES: Record<Kind, string> = {
  crypto: "Binance pair, e.g. XRPUSDT",
  stock: "Yahoo ticker, e.g. MSFT or BHP.AX",
  index: "Yahoo ticker, e.g. QQQ or ^AXJO",
  forex: "Yahoo ticker, e.g. EURJPY=X",
  commodity: "Yahoo ticker, e.g. CL=F for oil",
};

export default function WatchlistSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const w = useWatchlist(onSaved);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-panel sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="text-lg font-bold">Your watchlist</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-raised">
            <Icon name="close" />
          </button>
        </div>
        <ul className="flex-1 divide-y divide-line overflow-auto px-5">
          {w.list.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{i.name}</span>
                <span className="text-xs text-muted">{KIND_LABEL[i.kind]} · {i.ticker}</span>
              </span>
              <button onClick={() => w.remove(i.id)} disabled={w.saving} className="text-sm font-semibold text-loss">Remove</button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 border-t border-line p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <p className="font-semibold">Add an instrument</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={w.draft.kind} onChange={(e) => w.setDraft({ kind: e.target.value as Kind })} className="field">
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <input value={w.draft.name} onChange={(e) => w.setDraft({ name: e.target.value })} placeholder="Name, e.g. Microsoft" className="field" />
          </div>
          <input value={w.draft.ticker} onChange={(e) => w.setDraft({ ticker: e.target.value })} placeholder={EXAMPLES[w.draft.kind]} className="field" />
          {w.error && <p className="text-sm text-loss">{w.error}</p>}
          <div className="flex gap-2">
            <button onClick={w.add} disabled={w.saving} className="btn-primary flex-1">Add to watchlist</button>
            <button onClick={w.reset} disabled={w.saving} className="btn-ghost">Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}
