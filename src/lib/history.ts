import { fromZonedTime } from "date-fns-tz";
import { query } from "./db";
import { scoreImpact } from "./impact";
import type { NewsContext } from "./trading";

const GDELT = process.env.GDELT_BASE_URL || "https://api.gdeltproject.org";
const FRED = process.env.FRED_BASE_URL || "https://api.stlouisfed.org";
const GDELT_QUERY = process.env.GDELT_QUERY || "(bitcoin OR btc OR crypto OR cryptocurrency) sourcelang:english";
const GDELT_GAP_MS = Number(process.env.GDELT_GAP_MS || 5200);

export const HEADLINE_HOURS = 3;
export const EVENT_MINUTES = 120;

const MACRO = [
  { match: "consumer price index", label: "US CPI inflation", time: "08:30", impact: "high" },
  { match: "employment situation", label: "US jobs report", time: "08:30", impact: "high" },
  { match: "fomc press release", label: "Fed rate decision", time: "14:00", impact: "high" },
  { match: "producer price index", label: "US PPI inflation", time: "08:30", impact: "medium" },
  { match: "gross domestic product", label: "US GDP", time: "08:30", impact: "medium" },
  { match: "personal income and outlays", label: "US PCE inflation", time: "08:30", impact: "medium" },
];


const g = globalThis as unknown as { __gdeltLast?: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setting(key: string) {
  const [row] = await query(`SELECT value FROM settings WHERE key = $1`, [key]);
  return row?.value;
}

async function saveSetting(key: string, value: unknown) {
  await query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, JSON.stringify(value)]);
}

async function fred(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, api_key: process.env.FRED_API_KEY!, file_type: "json" });
  const res = await fetch(`${FRED}/fred/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FRED returned ${res.status}${res.status === 400 ? " (check FRED_API_KEY)" : ""}`);
  return res.json();
}

export async function loadMacroEvents(force = false) {
  if (!process.env.FRED_API_KEY) return { configured: false, matched: [] as string[], missing: MACRO.map((m) => m.label) };
  const cached = await setting("macro_loaded");
  if (!force && cached && Date.now() - Date.parse(cached.at) < 7 * 86400e3) return { configured: true, ...cached };

  const { releases } = await fred("releases", { limit: "1000" });
  const matched: string[] = [];
  const missing: string[] = [];
  for (const m of MACRO) {
    const named = (releases as any[]).filter((r) => String(r.name).toLowerCase().includes(m.match));
    const release = named.find((r) => String(r.name).toLowerCase() === m.match) ?? named[0];
    if (!release) {
      missing.push(m.label);
      continue;
    }
    const { release_dates } = await fred("release/dates", {
      release_id: String(release.id),
      realtime_start: "2017-01-01",
      include_release_dates_with_no_data: "true",
      limit: "10000",
    });
    for (const d of release_dates as any[]) {
      const at = fromZonedTime(`${d.date}T${m.time}:00`, "America/New_York");
      await query(`INSERT INTO macro_events (name, impact, at) VALUES ($1, $2, $3) ON CONFLICT (name, at) DO NOTHING`, [m.label, m.impact, at]);
    }
    matched.push(m.label);
  }
  const result = { at: new Date().toISOString(), matched, missing };
  await saveSetting("macro_loaded", result);
  return { configured: true, ...result };
}

const gdeltTime = (d: Date) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
const parseSeen = (s: string) => new Date(s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"));

async function gdeltWindow(from: Date, to: Date) {
  const wait = (g.__gdeltLast ?? 0) + GDELT_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  g.__gdeltLast = Date.now();

  const qs = new URLSearchParams({
    query: GDELT_QUERY,
    mode: "artlist",
    format: "json",
    maxrecords: "75",
    sort: "datedesc",
    startdatetime: gdeltTime(from),
    enddatetime: gdeltTime(to),
  });
  const res = await fetch(`${GDELT}/api/v2/doc/doc?${qs}`, { cache: "no-store", headers: { "User-Agent": "TradeDesk/1.0" } });
  const body = await res.text();
  if (!res.ok || /limit requests/i.test(body)) throw new Error(`GDELT is busy (${res.status}). Try again in a minute.`);
  if (!body.trim().startsWith("{")) return 0;

  let inserted = 0;
  for (const a of JSON.parse(body).articles ?? []) {
    if (!a.title || !a.url) continue;
    const when = parseSeen(a.seendate ?? "");
    const impact = scoreImpact(a.title, "");
    const rows = await query(
      `INSERT INTO news_articles (link, source, title, summary, published_at, sentiment, sentiment_score, impact_score, impact_level, is_crypto)
       VALUES ($1,$2,$3,'',$4,$5,$6,$7,$8,$9) ON CONFLICT (link) DO NOTHING RETURNING id`,
      [a.url, a.domain || "gdelt", a.title, isNaN(when.getTime()) ? to : when, impact.sentiment, impact.compound, impact.score, impact.level, impact.isCrypto],
    );
    inserted += rows.length;
  }
  return inserted;
}

async function headlineStats(entry: Date) {
  const [row] = await query(
    `SELECT count(*)::int AS n, count(*) FILTER (WHERE impact_level = 'High')::int AS high,
            sum(sentiment_score * greatest(impact_score, 10)) / nullif(sum(greatest(impact_score, 10)), 0) AS sentiment
     FROM news_articles
     WHERE published_at BETWEEN $1::timestamptz - make_interval(hours => $2::int) AND $1::timestamptz`,
    [entry, HEADLINE_HOURS],
  );
  return { count: row.n as number, highCount: row.high as number, sentiment: row.sentiment == null ? null : Number(row.sentiment) };
}

export async function macroNear(entry: Date | string, minutes = EVENT_MINUTES) {
  return query(
    `SELECT name, impact, at, round(extract(epoch FROM at - $1::timestamptz) / 60)::int AS minutes
     FROM macro_events
     WHERE at BETWEEN $1::timestamptz - make_interval(mins => $2::int) AND $1::timestamptz + make_interval(mins => $2::int)
     ORDER BY CASE impact WHEN 'high' THEN 0 ELSE 1 END, abs(extract(epoch FROM at - $1::timestamptz))`,
    [entry, minutes],
  );
}

const SENTIMENT_VERSION = 2;

async function rescoreSavedNews() {
  if ((await setting("sentiment_version")) === SENTIMENT_VERSION) return false;
  const rows = await query(`SELECT id, title, summary FROM news_articles`);
  for (const r of rows) {
    const s = scoreImpact(r.title, r.summary ?? "");
    await query(`UPDATE news_articles SET sentiment = $2, sentiment_score = $3, impact_score = $4, impact_level = $5 WHERE id = $1`, [r.id, s.sentiment, s.compound, s.score, s.level]);
  }
  await saveSetting("sentiment_version", SENTIMENT_VERSION);
  return true;
}

export async function matchBatch({ budgetMs = 45000, reset = false } = {}) {
  const started = Date.now();
  if ((await rescoreSavedNews()) || reset) await query(`UPDATE trades SET news_context = NULL`);

  const errors: string[] = [];
  let macro: Awaited<ReturnType<typeof loadMacroEvents>> = { configured: false, matched: [], missing: [] };
  try {
    macro = await loadMacroEvents();
  } catch (e) {
    errors.push(`Economic calendar: ${(e as Error).message}`);
  }

  const pending = await query(`SELECT id, entry_time AS "entryTime" FROM trades WHERE news_context IS NULL ORDER BY entry_time DESC LIMIT 200`);
  let processed = 0;

  for (const t of pending) {
    if (Date.now() - started > budgetMs) break;
    const entry = new Date(t.entryTime);
    const sources: string[] = [];
    let stats = await headlineStats(entry);
    if (stats.count) sources.push("saved");

    if (!stats.count && Date.now() - entry.getTime() > 3600e3) {
      try {
        await gdeltWindow(new Date(entry.getTime() - HEADLINE_HOURS * 3600e3), entry);
        sources.push("gdelt");
        stats = await headlineStats(entry);
      } catch (e) {
        errors.push((e as Error).message);
        break;
      }
    }

    const [event] = macro.configured ? await macroNear(entry) : [];
    const context: NewsContext = {
      checkedAt: new Date().toISOString(),
      sources,
      ...stats,
      macro: event ? { name: event.name, impact: event.impact, minutes: event.minutes } : null,
      macroChecked: macro.configured && !errors.length,
    };
    await query(`UPDATE trades SET news_context = $2 WHERE id = $1`, [t.id, JSON.stringify(context)]);
    processed++;
  }

  return { processed, remaining: (await matchStatus()).pending, errors: [...new Set(errors)], macro };
}

export async function matchStatus() {
  const [row] = await query(
    `SELECT count(*)::int AS total,
            count(news_context)::int AS matched,
            count(*) FILTER (WHERE (news_context->>'count')::int > 0)::int AS "withHeadlines",
            count(*) FILTER (WHERE news_context->'macro' IS NOT NULL AND news_context->>'macro' <> 'null')::int AS "withEvent"
     FROM trades`,
  );
  const [ev] = await query(`SELECT count(*)::int AS n, min(at) AS first FROM macro_events`);
  return {
    ...row,
    pending: row.total - row.matched,
    macroConfigured: !!process.env.FRED_API_KEY,
    macroEvents: ev.n as number,
    macroFrom: ev.first,
    macroInfo: await setting("macro_loaded"),
  };
}
