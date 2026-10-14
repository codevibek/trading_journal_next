"use client";

import { useState } from "react";
import { useBriefing, VOICES } from "@/hooks/useBriefing";
import Icon from "./Icon";

export default function BriefingCard({ highCount, total }: { highCount: number; total: number }) {
  const b = useBriefing();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const s = b.settings;

  return (
    <section className="relative overflow-hidden rounded-[1.25rem] bg-brand-strong p-5 text-white shadow-lg shadow-brand/20 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/70">Morning briefing</p>
            <p className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
              {total ? `${highCount} high-impact ${highCount === 1 ? "story" : "stories"} out of ${total} in the last 24 hours` : "No news saved in the last 24 hours yet"}
            </p>
          </div>
          <button onClick={() => setSettingsOpen(true)} aria-label="Briefing settings" className="rounded-xl bg-white/15 p-2 hover:bg-white/25">
            <Icon name="settings" className="h-5 w-5" />
          </button>
        </div>

        {b.audioUrl ? (
          <audio src={b.audioUrl} autoPlay controls className="w-full" />
        ) : (
          <button onClick={b.generate} disabled={b.loading || !s} className="flex items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 font-semibold text-brand-strong">
            <Icon name="play" fill className="h-5 w-5" />
            {b.loading ? "Recording your briefing…" : "Listen now"}
          </button>
        )}
        {b.error && <p className="rounded-lg bg-white/15 px-3 py-2 text-sm">{b.error}</p>}
        {b.script && (
          <button onClick={() => setScriptOpen(!scriptOpen)} className="self-start text-sm font-medium text-white/80 underline-offset-4 hover:underline">
            {scriptOpen ? "Hide the script" : "Read the script instead"}
          </button>
        )}
        {scriptOpen && <p className="whitespace-pre-line rounded-xl bg-white/10 p-4 text-sm leading-relaxed">{b.script}</p>}
      </div>

      {settingsOpen && s && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 text-text sm:items-center sm:p-4" onClick={() => setSettingsOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-panel p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Briefing settings</h2>
              <button onClick={() => setSettingsOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-raised">
                <Icon name="close" />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-5 text-sm">
              <label className="flex flex-col gap-2">
                <span className="flex justify-between"><span className="font-medium">Number of stories</span><span className="text-muted">{s.items}</span></span>
                <input type="range" min={3} max={20} value={s.items} onChange={(e) => b.updateSettings({ items: +e.target.value })} className="accent-brand" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex justify-between"><span className="font-medium">Skip stories below impact</span><span className="text-muted">{s.minImpact}</span></span>
                <input type="range" min={0} max={80} step={5} value={s.minImpact} onChange={(e) => b.updateSettings({ minImpact: +e.target.value })} className="accent-brand" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-medium">Voice</span>
                <select value={s.voice} onChange={(e) => b.updateSettings({ voice: e.target.value })} className="field">
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex justify-between"><span className="font-medium">Speed</span><span className="text-muted">{s.rate > 0 ? "+" : ""}{s.rate}%</span></span>
                <input type="range" min={-20} max={40} step={10} value={s.rate} onChange={(e) => b.updateSettings({ rate: +e.target.value })} className="accent-brand" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-medium">Read summaries too</span>
                <input type="checkbox" checked={s.summaries} onChange={(e) => b.updateSettings({ summaries: e.target.checked })} className="h-5 w-5 accent-brand" />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-medium">Crypto stories only</span>
                <input type="checkbox" checked={s.cryptoOnly} onChange={(e) => b.updateSettings({ cryptoOnly: e.target.checked })} className="h-5 w-5 accent-brand" />
              </label>
              <p className="text-muted">Saved automatically. The 6am run records your briefing with these settings so it plays straight away.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
