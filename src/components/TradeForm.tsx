"use client";

import type { TradeDraft } from "@/hooks/useTrade";

type Props = {
  draft: TradeDraft;
  update: (patch: Partial<TradeDraft>) => void;
  strategies: string[];
  image: File | null;
  setImage: (f: File | null) => void;
  imageSrc: string | null;
  onRemoveImage?: () => void;
};

const input = "w-full rounded-lg border border-line bg-raised px-3 py-2.5";

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line bg-raised p-1">
      {options.map(([v, label, tone]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-md py-2 text-sm font-medium ${value === v ? tone : "text-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function TradeForm({ draft, update, strategies, image, setImage, imageSrc, onRemoveImage }: Props) {
  const preview = image ? URL.createObjectURL(image) : imageSrc;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Strategy</span>
        <input list="strategies" value={draft.strategy} onChange={(e) => update({ strategy: e.target.value })} className={input} placeholder="e.g. London breakout" />
        <datalist id="strategies">{strategies.map((s) => <option key={s} value={s} />)}</datalist>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Direction</span>
          <Segmented value={draft.side} onChange={(side) => update({ side })} options={[["long", "Long", "bg-win-soft text-win"], ["short", "Short", "bg-loss-soft text-loss"]]} />
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Result</span>
          <Segmented
            value={draft.outcome}
            onChange={(outcome) => update({ outcome })}
            options={[["win", "Profit", "bg-win-soft text-win"], ["loss", "Loss", "bg-loss-soft text-loss"], ["be", "Breakeven", "bg-panel text-text"]]}
          />
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Entry time (start of the 15m candle)</span>
        <input type="datetime-local" step={900} value={draft.entryTime} onChange={(e) => update({ entryTime: e.target.value })} className={input} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Entry price</span>
          <input inputMode="decimal" value={draft.entryPrice} onChange={(e) => update({ entryPrice: e.target.value })} className={input} placeholder="63250" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Exit price</span>
          <input inputMode="decimal" value={draft.exitPrice} onChange={(e) => update({ exitPrice: e.target.value })} className={input} placeholder="63850" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Notes</span>
        <textarea rows={5} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} className={input} placeholder="Why you took it, how you felt, what you'd do differently" />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-muted">Chart screenshot</span>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Trade screenshot" className="max-h-80 w-full rounded-lg border border-line object-contain" />
        )}
        <div className="flex gap-3">
          <label className="cursor-pointer rounded-lg border border-line px-3 py-2 hover:bg-raised">
            {preview ? "Replace screenshot" : "Add screenshot"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </label>
          {image && <button type="button" onClick={() => setImage(null)} className="text-muted">Discard new image</button>}
          {!image && imageSrc && onRemoveImage && <button type="button" onClick={onRemoveImage} className="text-loss">Remove</button>}
        </div>
      </div>
    </div>
  );
}
