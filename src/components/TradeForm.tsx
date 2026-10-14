"use client";

import type { TradeDraft } from "@/hooks/useTrade";
import Icon from "./Icon";

type Props = {
  draft: TradeDraft;
  update: (patch: Partial<TradeDraft>) => void;
  strategies: string[];
  image: File | null;
  setImage: (f: File | null) => void;
  imageSrc: string | null;
  onRemoveImage?: () => void;
};

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-2">
      {options.map(([v, label, tone]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${value === v ? tone : "border-line bg-panel text-muted hover:text-text"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <span className="text-sm font-semibold">{children}</span>;

export default function TradeForm({ draft, update, strategies, image, setImage, imageSrc, onRemoveImage }: Props) {
  const preview = image ? URL.createObjectURL(image) : imageSrc;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card flex flex-col gap-5 p-5">
        <label className="flex flex-col gap-2">
          <Label>Strategy</Label>
          <input list="strategies" value={draft.strategy} onChange={(e) => update({ strategy: e.target.value })} className="field" placeholder="e.g. London breakout" />
          <datalist id="strategies">{strategies.map((s) => <option key={s} value={s} />)}</datalist>
        </label>

        <div className="flex flex-col gap-2">
          <Label>Direction</Label>
          <Choice value={draft.side} onChange={(side) => update({ side })} options={[["long", "Long", "border-win bg-win-soft text-win"], ["short", "Short", "border-loss bg-loss-soft text-loss"]]} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Result</Label>
          <Choice
            value={draft.outcome}
            onChange={(outcome) => update({ outcome })}
            options={[["win", "Profit +2R", "border-win bg-win-soft text-win"], ["loss", "Loss −1R", "border-loss bg-loss-soft text-loss"], ["be", "Breakeven", "border-text bg-raised text-text"]]}
          />
        </div>

        <label className="flex flex-col gap-2">
          <Label>Entry time</Label>
          <input type="datetime-local" step={900} value={draft.entryTime} onChange={(e) => update({ entryTime: e.target.value })} className="field" />
          <span className="text-xs text-muted">The open of the 15m candle you entered on, in your local time.</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <Label>Entry price</Label>
            <input inputMode="decimal" value={draft.entryPrice} onChange={(e) => update({ entryPrice: e.target.value })} className="field" placeholder="63250" />
          </label>
          <label className="flex flex-col gap-2">
            <Label>Exit price</Label>
            <input inputMode="decimal" value={draft.exitPrice} onChange={(e) => update({ exitPrice: e.target.value })} className="field" placeholder="63850" />
          </label>
        </div>
      </div>

      <div className="card flex flex-col gap-5 p-5">
        <label className="flex flex-col gap-2">
          <Label>Notes</Label>
          <textarea rows={6} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} className="field" placeholder="Why you took it, how you felt, what you'd do differently" />
        </label>

        <div className="flex flex-col gap-2">
          <Label>Chart screenshot</Label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Trade screenshot" className="max-h-72 w-full rounded-xl border border-line object-contain" />
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted hover:border-brand hover:text-brand">
              <Icon name="image" className="h-6 w-6" />
              Add a screenshot
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {preview && (
            <div className="flex gap-3 text-sm">
              <label className="cursor-pointer font-semibold text-brand">
                Replace
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
              </label>
              {image && <button type="button" onClick={() => setImage(null)} className="text-muted">Discard new image</button>}
              {!image && imageSrc && onRemoveImage && <button type="button" onClick={onRemoveImage} className="font-semibold text-loss">Remove</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
