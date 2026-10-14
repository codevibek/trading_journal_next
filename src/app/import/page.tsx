"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { FIELDS, useCsvImport } from "@/hooks/useCsvImport";
import { dateTime } from "@/lib/format";

const ZONES = ["Australia/Sydney", "Australia/Brisbane", "Australia/Perth", "UTC", "Europe/London", "America/New_York", "Asia/Singapore"];
const STEPS = ["Upload", "Match columns", "Review"];

function Step({ n, title, current, children }: { n: number; title: string; current: number; children?: React.ReactNode }) {
  const done = current > n;
  const active = current === n;
  return (
    <section className={`card p-5 ${active || done ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-win text-white" : active ? "bg-brand-strong text-white" : "bg-raised text-muted"}`}>
          {done ? <Icon name="check" className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {(active || done) && children && <div className="mt-4">{children}</div>}
    </section>
  );
}

export default function ImportPage() {
  const im = useCsvImport();
  const zones = ZONES.includes(im.timeZone) ? ZONES : [im.timeZone, ...ZONES];
  const ready = im.preview?.filter((r) => r.ok).length ?? 0;
  const step = im.summary ? 4 : im.preview ? 3 : im.headers.length ? 2 : 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Import from Notion" subtitle="Bring your existing trade log in, screenshots included." />

      <ol className="flex gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 rounded-full py-1.5 text-center font-semibold ${step > i + 1 ? "bg-win-soft text-win" : step === i + 1 ? "bg-brand-soft text-brand" : "bg-raised text-muted"}`}>
            {s}
          </li>
        ))}
      </ol>

      <Step n={1} title="Upload your export" current={step}>
        <p className="mb-3 text-sm text-muted">In Notion, open the trade database, then choose ••• → Export → Markdown &amp; CSV. Upload the .zip to include screenshots, or just the .csv.</p>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center hover:border-brand">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon name="import" /></span>
          <span className="font-semibold">{im.fileName || "Choose a .zip or .csv file"}</span>
          <span className="text-sm text-muted">
            {im.fileName ? `${im.rows.length} rows${im.imageCount ? ` and ${im.imageCount} screenshots found` : ""}` : "Nothing is saved until you confirm"}
          </span>
          <input type="file" accept=".csv,.zip" className="hidden" onChange={(e) => e.target.files?.[0] && im.loadFile(e.target.files[0])} />
        </label>
      </Step>

      <Step n={2} title="Match your columns" current={step}>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">{f.label}{!f.required && <span className="font-normal text-muted"> (optional)</span>}</span>
              <select value={im.mapping[f.key] ?? ""} onChange={(e) => im.setMapping(f.key, e.target.value)} className={`field ${f.required && !im.mapping[f.key] ? "border-loss" : ""}`}>
                <option value="">Not in my file</option>
                {im.headers.map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">Timezone of your dates</span>
            <select value={im.timeZone} onChange={(e) => im.setTimeZone(e.target.value)} className="field">
              {zones.map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">Dates like 03/04/2026 mean</span>
            <select value={im.dayFirst ? "d" : "m"} onChange={(e) => im.setDayFirst(e.target.value === "d")} className="field">
              <option value="d">3 April (day first)</option>
              <option value="m">4 March (month first)</option>
            </select>
          </label>
        </div>
        {im.missing.length > 0 && <p className="mt-3 text-sm text-loss">Pick a column for: {im.missing.join(", ")}.</p>}
        {step === 2 && (
          <button onClick={im.check} disabled={im.busy || im.missing.length > 0} className="btn-primary mt-4">
            Check {im.rows.length} rows
          </button>
        )}
      </Step>

      <Step n={3} title="Review and import" current={step}>
        {im.preview && !im.summary && (
          <div className="flex flex-col gap-3">
            <p>
              <span className="font-bold text-win">{ready} ready</span>
              {im.preview.length - ready > 0 && <span className="font-bold text-loss">, {im.preview.length - ready} with problems (skipped)</span>}
            </p>
            <ul className="max-h-80 divide-y divide-line overflow-auto rounded-xl border border-line text-sm">
              {im.preview.map((r) => (
                <li key={r.index} className="flex gap-3 px-4 py-2.5">
                  <span className="w-12 shrink-0 text-muted">Row {r.index + 2}</span>
                  <span className={r.ok ? "" : "text-loss"}>
                    {r.ok ? dateTime(r.entryTime!) : r.errors.join(" ")}
                    {r.warnings.length > 0 && <span className="text-news"> {r.warnings.join(" ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">Compare a few times with Notion. If they&apos;re all off by the same number of hours, change the timezone in step 2.</p>
            <button onClick={im.commit} disabled={im.busy || !ready} className="btn-primary self-start px-6 py-3">
              {im.status || `Import ${ready} trades`}
            </button>
          </div>
        )}
      </Step>

      {im.error && <p className="text-sm text-loss">{im.error}</p>}

      {im.summary && (
        <section className="card flex flex-col items-start gap-3 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-win-soft text-win"><Icon name="check" /></span>
          <div>
            <p className="text-lg font-bold">Imported {im.summary.inserted} trades</p>
            <p className="text-sm text-muted">
              {im.summary.images} screenshots attached{im.summary.duplicates > 0 && `, ${im.summary.duplicates} already in your journal were skipped`}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/insights" className="btn-primary">See insights</Link>
            <Link href="/journal" className="btn-ghost">Open journal</Link>
          </div>
        </section>
      )}
    </div>
  );
}
