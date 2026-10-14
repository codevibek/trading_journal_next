"use client";

import Link from "next/link";
import { FIELDS, useCsvImport } from "@/hooks/useCsvImport";
import { dateTime } from "@/lib/format";

const ZONES = ["Australia/Sydney", "Australia/Brisbane", "Australia/Perth", "UTC", "Europe/London", "America/New_York", "Asia/Singapore"];

export default function ImportPage() {
  const im = useCsvImport();
  const zones = ZONES.includes(im.timeZone) ? ZONES : [im.timeZone, ...ZONES];
  const problems = im.preview?.filter((r) => !r.ok) ?? [];
  const ready = im.preview?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Import from Notion</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          In Notion, open your trade database, choose Export, then Markdown &amp; CSV. Upload the whole .zip to bring screenshots along, or just the .csv.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line bg-panel p-8 text-center hover:border-amber">
        <span className="font-medium">{im.fileName || "Choose a .zip or .csv file"}</span>
        <span className="text-sm text-muted">
          {im.fileName ? `${im.rows.length} rows${im.imageCount ? `, ${im.imageCount} screenshots found` : ""}` : "Nothing is saved until you confirm"}
        </span>
        <input type="file" accept=".csv,.zip" className="hidden" onChange={(e) => e.target.files?.[0] && im.loadFile(e.target.files[0])} />
      </label>

      {im.headers.length > 0 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-semibold">Match your columns</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                <span className="text-muted">{f.label}{f.required ? "" : " (optional)"}</span>
                <select value={im.mapping[f.key] ?? ""} onChange={(e) => im.setMapping(f.key, e.target.value)} className="rounded-lg border border-line bg-raised px-2 py-2">
                  <option value="">Not in my file</option>
                  {im.headers.map((h) => <option key={h}>{h}</option>)}
                </select>
              </label>
            ))}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Timezone the dates were logged in</span>
              <select value={im.timeZone} onChange={(e) => im.setTimeZone(e.target.value)} className="rounded-lg border border-line bg-raised px-2 py-2">
                {zones.map((z) => <option key={z}>{z}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">For dates like 03/04/2026</span>
              <select value={im.dayFirst ? "d" : "m"} onChange={(e) => im.setDayFirst(e.target.value === "d")} className="rounded-lg border border-line bg-raised px-2 py-2">
                <option value="d">Day comes first</option>
                <option value="m">Month comes first</option>
              </select>
            </label>
          </div>
          {im.missing.length > 0 && <p className="text-sm text-loss">Pick a column for: {im.missing.join(", ")}.</p>}
          <button onClick={im.check} disabled={im.busy || im.missing.length > 0} className="rounded-xl border border-line py-2.5 font-medium disabled:opacity-50">
            Check rows
          </button>
        </section>
      )}

      {im.error && <p className="text-sm text-loss">{im.error}</p>}

      {im.preview && !im.summary && (
        <section className="flex flex-col gap-3">
          <p>
            <span className="font-semibold">{ready} of {im.preview.length}</span> rows are ready to import.
            {problems.length > 0 && " Rows with problems will be skipped."}
          </p>
          <ul className="flex max-h-96 flex-col divide-y divide-line overflow-auto rounded-2xl border border-line bg-panel text-sm">
            {im.preview.map((r) => (
              <li key={r.index} className="flex gap-3 px-4 py-2.5">
                <span className="w-10 shrink-0 text-muted">#{r.index + 2}</span>
                <span className={r.ok ? "" : "text-loss"}>
                  {r.ok ? dateTime(r.entryTime!) : r.errors.join(" ")}
                  {r.warnings.length > 0 && <span className="text-amber"> {r.warnings.join(" ")}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">Check a few times against Notion. If they&apos;re all off by the same hours, change the timezone above.</p>
          <button onClick={im.commit} disabled={im.busy || !ready} className="rounded-xl bg-amber py-3 font-medium text-bg disabled:opacity-60">
            {im.status || `Import ${ready} trades`}
          </button>
        </section>
      )}

      {im.summary && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <p className="font-semibold">Imported {im.summary.inserted} trades.</p>
          <p className="mt-1 text-sm text-muted">
            {im.summary.images} screenshots attached
            {im.summary.duplicates > 0 && `, ${im.summary.duplicates} already in your journal were skipped`}.
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href="/insights" className="rounded-lg bg-amber px-4 py-2 font-medium text-bg">Analyse them</Link>
            <Link href="/journal" className="rounded-lg border border-line px-4 py-2">Open journal</Link>
          </div>
        </section>
      )}
    </div>
  );
}
