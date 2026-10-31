import { fromZonedTime } from "date-fns-tz";
import { cachedAudio, savedOptions } from "./briefing";
import { query } from "./db";
import { scoreImpact } from "./impact";
import type { Instrument } from "./instruments";
import { candles } from "./market";

export type Market = "asx" | "us";
export const MARKETS: Market[] = ["asx", "us"];

const ASX = process.env.ASX_BASE_URL || "https://www.asx.com.au";
const SEC = process.env.SEC_BASE_URL || "https://www.sec.gov";
const SEC_UA =
  process.env.SEC_USER_AGENT || "TradeDesk personal app admin@example.com";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const SESSION_MS = { asx: 6 * 3600e3, us: 6.5 * 3600e3 };
const SEC_DATA = process.env.SEC_DATA_URL || "https://data.sec.gov";
const CHECK_LIMIT = 40;

export const TIERS = ["Blue chip", "Mid cap", "Small cap"] as const;
const CAP_LIMITS = { asx: [10e9, 2e9], us: [10e9, 2e9] };
const TURNOVER_LIMITS = { asx: [40e6, 5e6], us: [200e6, 20e6] };

type Item = {
  uid: string;
  ticker: string;
  company: string | null;
  title: string;
  category: string;
  score: number;
  priceSensitive: boolean;
  url: string;
  publishedAt: Date;
};

const level = (score: number) =>
  score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
const text = (html: string) =>
  decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

async function setting(key: string) {
  const [row] = await query(`SELECT value FROM settings WHERE key = $1`, [key]);
  return row?.value;
}

async function saveSetting(key: string, value: unknown) {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)],
  );
}

async function cachedMap(
  key: string,
  load: () => Promise<Record<string, string[]>>,
) {
  const saved = await setting(key);
  if (saved && Date.now() - Date.parse(saved.at) < 7 * 86400e3)
    return saved.map as Record<string, string[]>;
  try {
    const map = await load();
    if (Object.keys(map).length)
      await saveSetting(key, { at: new Date().toISOString(), map });
    return map;
  } catch {
    return (saved?.map ?? {}) as Record<string, string[]>;
  }
}

const ASX_RULES: [RegExp, string, number][] = [
  [
    /appendix 2a|appendix 3[a-z]|cleansing|director'?s interest|application for quotation|proposed issue|notification of (buy-back|cessation)|change of (address|registry)|issue of (options|performance rights)/i,
    "Admin",
    10,
  ],
  [/trading halt|suspension|suspended/i, "Trading halt", 85],
  [
    /takeover|scheme (of arrangement|implementation|booklet|meeting)|bidder'?s statement|target'?s statement|merger|indicative (offer|proposal)/i,
    "Takeover or merger",
    90,
  ],
  [
    /(half|full)[- ]year|annual results|financial results|results (announcement|presentation)|appendix 4[de]|preliminary final|earnings|profit/i,
    "Results",
    85,
  ],
  [/guidance|upgrade|downgrade|outlook|trading update/i, "Guidance", 80],
  [
    /placement|capital raising|entitlement offer|share purchase plan|\bSPP\b|equity raising/i,
    "Capital raising",
    75,
  ],
  [
    /FDA|TGA|clinical|\btrial\b|patent|regulatory approval/i,
    "Regulatory or trial",
    70,
  ],
  [/acquisition|acquire|divest|disposal|sale of/i, "Acquisition or sale", 65],
  [
    /assay|drill|intercept|high[- ]grade|mineral resource|ore reserve|discovery|JORC/i,
    "Exploration results",
    65,
  ],
  [/price query|aware letter|response to asx/i, "ASX query", 60],
  [/contract|offtake|partnership|award|agreement/i, "Contract", 60],
  [/reinstatement|resumption|reinstated/i, "Back trading", 55],
  [
    /quarterly|appendix 4c|appendix 5b|activities report|cash ?flow report/i,
    "Quarterly report",
    55,
  ],
  [
    /\b(CEO|managing director|chief executive|chair(man)?)\b/i,
    "Leadership change",
    50,
  ],
  [/dividend|distribution|buy-?back/i, "Dividend or buy-back", 45],
  [/substantial holder/i, "Substantial holder", 30],
];

function classifyAsx(title: string, priceSensitive: boolean) {
  const [, category, base] = ASX_RULES.find(([re]) => re.test(title)) ?? [
    null,
    "Announcement",
    35,
  ];
  const score = priceSensitive
    ? Math.min(Math.max(base, 50) + 10, 100)
    : Math.round(base * 0.6);
  return { category, score };
}

const asxNames = () =>
  cachedMap("asx_companies", async () => {
    const res = await fetch(`${ASX}/asx/research/ASXListedCompanies.csv`, {
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ASX company list returned ${res.status}`);
    const map: Record<string, string[]> = {};
    for (const line of (await res.text()).split(/\r?\n/)) {
      const m = line.match(/^"?(.+?)"?,"?([A-Z0-9]{3,6})"?,/);
      if (m)
        map[m[2]] = [
          m[1].toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()),
        ];
    }
    return map;
  });

export function parseAsxTable(html: string) {
  const rows: {
    code: string;
    when: string;
    priceSensitive: boolean;
    title: string;
    url: string;
  }[] = [];
  for (const tr of html.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (m) => m[1],
    );
    const link = cells
      .map((c) =>
        c.match(
          /<a[^>]*href="([^"]*displayAnnouncement[^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
        ),
      )
      .find(Boolean);
    const when = cells.map(text).find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
    const code = cells.map(text).find((c) => /^[A-Z0-9]{3,6}$/.test(c));
    if (!link || !when || !code) continue;
    const title = text(link[2].split(/<br|<span/i)[0]).replace(
      /\s*\d+\s+pages?.*$/i,
      "",
    );
    rows.push({
      code,
      when,
      priceSensitive: cells.some((c) => /price.?sensitive|pricesens/i.test(c)),
      title,
      url: new URL(decode(link[1]), ASX).toString(),
    });
  }
  return rows;
}

function asxDate(s: string) {
  const m = s.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  );
  if (!m) return null;
  let h = Number(m[4]) % 12;
  if (m[6]?.toLowerCase() === "pm") h += 12;
  if (!m[6]) h = Number(m[4]);
  return fromZonedTime(
    `${m[3]}-${m[2]}-${m[1]}T${String(h).padStart(2, "0")}:${m[5]}:00`,
    "Australia/Sydney",
  );
}

async function fetchAsx(): Promise<Item[]> {
  const names = await asxNames();
  const items: Item[] = [];
  const errors: string[] = [];
  for (const page of ["prevBusDayAnns.do", "todayAnns.do"]) {
    const res = await fetch(`${ASX}/asx/v2/statistics/${page}`, {
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    if (!res.ok) {
      errors.push(`ASX ${page} returned ${res.status}`);
      continue;
    }
    for (const r of parseAsxTable(await res.text())) {
      const at = asxDate(r.when);
      if (!at) continue;
      if (Object.keys(names).length && !names[r.code]) continue;
      items.push({
        uid: r.url.match(/idsId=(\d+)/)?.[1] ?? r.url,
        ticker: r.code,
        company: names[r.code]?.[0] ?? null,
        title: r.title,
        priceSensitive: r.priceSensitive,
        url: r.url,
        publishedAt: at,
        ...classifyAsx(r.title, r.priceSensitive),
      });
    }
  }
  if (!items.length && errors.length) throw new Error(errors.join("; "));
  return items;
}

const ITEMS: Record<string, [string, number]> = {
  "1.01": ["Material agreement", 55],
  "1.02": ["Agreement terminated", 55],
  "1.03": ["Bankruptcy", 95],
  "1.05": ["Cybersecurity incident", 75],
  "2.01": ["Acquisition or sale completed", 70],
  "2.02": ["Earnings results", 85],
  "2.03": ["New debt", 45],
  "2.04": ["Debt default trigger", 80],
  "2.05": ["Restructuring or layoffs", 70],
  "2.06": ["Impairment", 70],
  "3.01": ["Delisting notice", 85],
  "3.02": ["Unregistered share sale", 45],
  "3.03": ["Shareholder rights changed", 45],
  "4.01": ["Auditor change", 50],
  "4.02": ["Past financials unreliable", 90],
  "5.01": ["Change of control", 85],
  "5.02": ["Executive or director change", 50],
  "5.03": ["Bylaws amended", 15],
  "5.07": ["Shareholder vote results", 20],
  "7.01": ["Investor update (Reg FD)", 35],
  "8.01": ["Other material event", 40],
};

const secTickers = () =>
  cachedMap("sec_tickers", async () => {
    const res = await fetch(`${SEC}/files/company_tickers.json`, {
      headers: { "User-Agent": SEC_UA },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SEC ticker list returned ${res.status}`);
    const map: Record<string, string[]> = {};
    for (const c of Object.values<any>(await res.json()))
      map[String(c.cik_str)] ??= [c.ticker, c.title];
    return map;
  });

export function parseSecAtom(xml: string) {
  return xml
    .split("<entry>")
    .slice(1)
    .map((e) => {
      const title = decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const summary = decode(
        e.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] ?? "",
      );
      const m = title.match(/^(\S+) - (.+?) \((\d{10})\) \((\w+)\)/);
      return {
        form: m?.[1] ?? "",
        company: m?.[2] ?? "",
        cik: m ? String(Number(m[3])) : "",
        role: m?.[4] ?? "",
        url: decode(e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? ""),
        updated: new Date(e.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? ""),
        accession: e.match(/accession-number=([\d-]+)/)?.[1] ?? "",
        items: [...summary.matchAll(/Item (\d\.\d{2})/g)].map((x) => x[1]),
      };
    });
}

async function fetchUs(): Promise<Item[]> {
  const tickers = await secTickers();
  if (!Object.keys(tickers).length)
    throw new Error("Couldn't load the SEC ticker list.");
  const cutoff = Date.now() - 36 * 3600e3;
  const items: Item[] = [];
  for (let start = 0; start < 600; start += 100) {
    const res = await fetch(
      `${SEC}/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&start=${start}&count=100&output=atom`,
      {
        headers: { "User-Agent": SEC_UA },
        cache: "no-store",
      },
    );
    if (!res.ok)
      throw new Error(
        `SEC returned ${res.status}${res.status === 403 ? " (set SEC_USER_AGENT to your name and email)" : ""}`,
      );
    const entries = parseSecAtom(await res.text());
    for (const e of entries) {
      const listed = tickers[e.cik];
      if (!listed || e.role !== "Filer" || !/^8-K/.test(e.form) || !e.accession)
        continue;
      const known = e.items
        .filter((i) => ITEMS[i])
        .sort((a, b) => ITEMS[b][1] - ITEMS[a][1]);
      if (!known.length) continue;
      const score = Math.max(
        ITEMS[known[0]][1] - (e.form.endsWith("/A") ? 15 : 0),
        0,
      );
      items.push({
        uid: e.accession,
        ticker: listed[0],
        company: e.company || listed[1],
        title: `${known.map((i) => ITEMS[i][0]).join(", ")}${e.form.endsWith("/A") ? " (amended)" : ""}`,
        category: ITEMS[known[0]][0],
        score,
        priceSensitive: score >= 70,
        url: e.url,
        publishedAt: e.updated,
      });
    }
    if (entries.length < 100 || entries.at(-1)!.updated.getTime() < cutoff)
      break;
    await sleep(200);
  }
  return items;
}

async function store(market: Market, items: Item[]) {
  let added = 0;
  for (const i of items) {
    const rows = await query(
      `INSERT INTO company_news (market, uid, ticker, company, title, category, impact, impact_score, price_sensitive, sentiment, url, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (market, uid) DO NOTHING RETURNING id`,
      [
        market,
        i.uid,
        i.ticker,
        i.company,
        i.title,
        i.category,
        level(i.score),
        i.score,
        i.priceSensitive,
        scoreImpact(i.title, "").sentiment,
        i.url,
        i.publishedAt,
      ],
    );
    added += rows.length;
  }
  await query(
    `DELETE FROM company_news WHERE published_at < now() - interval '30 days'`,
  );
  return added;
}

export function reactionFrom(
  bars: { t: number; c: number; v: number }[],
  publishedAt: number,
  sessionMs: number,
) {
  const i = bars.findIndex((b) => b.t + sessionMs > publishedAt);
  if (i === -1) return { status: "pending" as const };
  if (i < 6) return { status: "unknown" as const };
  const bar = bars[i];
  const prior = bars.slice(Math.max(0, i - 21), i);
  const moves = prior
    .slice(1)
    .map((b, k) => Math.abs(b.c / prior[k].c - 1) * 100);
  const typical = moves.reduce((a, b) => a + b, 0) / moves.length;
  const avgVol = prior.reduce((a, b) => a + b.v, 0) / prior.length;
  const change = (bar.c / bars[i - 1].c - 1) * 100;
  const volumeRatio = avgVol ? bar.v / avgVol : null;
  const confirmed =
    Math.abs(change) >= Math.max(2.5, typical * 2) || (volumeRatio ?? 0) >= 2;
  return {
    status: confirmed ? ("confirmed" as const) : ("muted" as const),
    change: Math.round(change * 100) / 100,
    typical: Math.round(typical * 100) / 100,
    volumeRatio: volumeRatio == null ? null : Math.round(volumeRatio * 10) / 10,
    sessionDate: new Date(bar.t).toISOString(),
    live: bar.t + sessionMs > Date.now(),
  };
}

const tierOf = (v: number, [blue, mid]: number[]) =>
  v >= blue ? TIERS[0] : v >= mid ? TIERS[1] : TIERS[2];

function quarters(n: number) {
  const out: string[] = [];
  const d = new Date();
  let y = d.getUTCFullYear();
  let q = Math.floor(d.getUTCMonth() / 3);
  for (let k = 0; k < n; k++) {
    if (q === 0) [y, q] = [y - 1, 4];
    out.push(`CY${y}Q${q}I`);
    q--;
  }
  return out;
}

const usShares = () =>
  cachedMap("sec_shares", async () => {
    const map: Record<string, string[]> = {};
    for (const period of quarters(4).reverse()) {
      const res = await fetch(
        `${SEC_DATA}/api/xbrl/frames/dei/EntityCommonStockSharesOutstanding/shares/${period}.json`,
        {
          headers: { "User-Agent": SEC_UA },
          cache: "no-store",
        },
      );
      if (!res.ok) continue;
      for (const d of (await res.json()).data ?? [])
        map[String(d.cik)] = [String(d.val)];
      await sleep(150);
    }
    return map;
  });

function sizeTier(
  market: Market,
  ticker: string,
  bars: { c: number; v: number }[],
  shares: Record<string, string[]>,
  ciks: Record<string, string>,
) {
  const last = bars.slice(-20);
  const turnover = last.reduce((a, b) => a + b.c * b.v, 0) / last.length;
  const count = market === "us" ? Number(shares[ciks[ticker]]?.[0]) : NaN;
  if (count > 0) {
    const cap = count * bars.at(-1)!.c;
    return {
      tier: tierOf(cap, CAP_LIMITS[market]),
      basis: "market cap",
      value: cap,
    };
  }
  return {
    tier: tierOf(turnover, TURNOVER_LIMITS[market]),
    basis: "daily turnover",
    value: turnover,
  };
}

async function validate(market: Market) {
  const pending = await query(
    `SELECT id, ticker, published_at AS "publishedAt" FROM company_news
     WHERE market = $1 AND impact <> 'Low'
       AND (reaction IS NULL OR ((reaction->>'status' = 'pending' OR (reaction->>'live')::boolean) AND checked_at < now() - interval '20 minutes'))
       AND published_at > now() - interval '7 days'
     ORDER BY impact_score DESC, published_at DESC LIMIT $2`,
    [market, CHECK_LIMIT],
  );
  const untiered = await query(
    `SELECT DISTINCT n.ticker FROM company_news n
     LEFT JOIN stock_tiers t ON t.market = n.market AND t.ticker = n.ticker
     WHERE n.market = $1 AND n.published_at > now() - interval '7 days' AND (t.ticker IS NULL OR t.updated_at < now() - interval '7 days')
     LIMIT $2`,
    [market, CHECK_LIMIT],
  );
  const tickers = [
    ...new Set([...pending, ...untiered].map((p) => p.ticker as string)),
  ];
  const bars = new Map<string, Awaited<ReturnType<typeof candles>> | null>();
  for (let k = 0; k < tickers.length; k += 4) {
    await Promise.all(
      tickers.slice(k, k + 4).map(async (t) => {
        const symbol = market === "asx" ? `${t}.AX` : t.replace(/\./g, "-");
        bars.set(
          t,
          await candles(
            { source: "yahoo", ticker: symbol } as Instrument,
            "1d",
            90,
          ).catch(() => null),
        );
      }),
    );
  }
  const shares = market === "us" ? await usShares() : {};
  const ciks =
    market === "us"
      ? Object.fromEntries(
          Object.entries(await secTickers()).map(([cik, [t]]) => [t, cik]),
        )
      : {};
  for (const [ticker, b] of bars) {
    if (!b || b.length < 5) continue;
    const t = sizeTier(market, ticker, b, shares, ciks);
    await query(
      `INSERT INTO stock_tiers (market, ticker, tier, basis, value, updated_at) VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (market, ticker) DO UPDATE SET tier = EXCLUDED.tier, basis = EXCLUDED.basis, value = EXCLUDED.value, updated_at = now()`,
      [market, ticker, t.tier, t.basis, t.value],
    );
  }
  for (const p of pending) {
    const b = bars.get(p.ticker);
    const reaction = b?.length
      ? reactionFrom(b, new Date(p.publishedAt).getTime(), SESSION_MS[market])
      : { status: "unknown" };
    await query(
      `UPDATE company_news SET reaction = $2, checked_at = now() WHERE id = $1`,
      [p.id, JSON.stringify(reaction)],
    );
  }
  return pending.length;
}

export async function refreshCompanyNews(market: Market) {
  const items = await (market === "asx" ? fetchAsx() : fetchUs());
  const added = await store(market, items);
  const checked = await validate(market);
  const result = {
    at: new Date().toISOString(),
    found: items.length,
    added,
    checked,
  };
  await saveSetting(`exchange_${market}`, result);
  return result;
}

export async function listCompanyNews(market: Market, all = false) {
  const items = await query(
    `SELECT n.id, n.ticker, company, title, category, impact, impact_score AS "impactScore", price_sensitive AS "priceSensitive",
            sentiment, url, published_at AS "publishedAt", reaction,
            t.tier, t.basis AS "tierBasis", t.value AS "tierValue"
     FROM company_news n
     LEFT JOIN stock_tiers t ON t.market = n.market AND t.ticker = n.ticker
     WHERE n.market = $1
       AND published_at >= (SELECT max(published_at) FROM company_news WHERE market = $1) - interval '24 hours'
       AND ($2 OR impact <> 'Low')
     ORDER BY impact_score DESC, published_at DESC LIMIT 300`,
    [market, all],
  );
  return { items, lastRefresh: (await setting(`exchange_${market}`)) ?? null };
}

const spell = (code: string) => code.split("").join(" ");
const spokenMove = (r: any) => {
  if (!r || r.status === "pending")
    return "The market hasn't traded on it yet.";
  if (r.status === "unknown") return "No price data to check the reaction.";
  const dir = r.change > 0 ? "up" : r.change < 0 ? "down" : "flat";
  const vol = r.volumeRatio ? ` on ${r.volumeRatio} times normal volume` : "";
  return `${r.live ? "So far the stock is" : "The stock closed"} ${dir} ${Math.abs(r.change).toFixed(1)} percent${vol}. ${r.status === "confirmed" ? "The market reacted." : "The reaction was muted."}`;
};

export async function buildExchangeScript(market: Market) {
  const { items: n } = await savedOptions();
  const { items } = await listCompanyNews(market);
  const picked = items.slice(0, n);
  const name = market === "asx" ? "ASX announcements" : "US company filings";
  if (!picked.length)
    return `${name} briefing. Nothing significant from the last trading day.`;
  const lines = picked.map((i, k) => {
    const who = i.company
      ? `${i.company.replace(/\.$/, "")}${market === "asx" ? `, ${spell(i.ticker)}` : ""}`
      : spell(i.ticker);
    return `Item ${k + 1}. ${i.tier ? `${i.tier}, ${i.impact.toLowerCase()}` : i.impact} impact. ${who}. ${i.title.replace(/\.$/, "")}. ${spokenMove(i.reaction)}`;
  });
  const confirmed = picked.filter(
    (i) => i.reaction?.status === "confirmed",
  ).length;
  return [
    `${name} briefing. ${picked.length} items, most important first. The market confirmed ${confirmed} of them with a real price or volume move.`,
    ...lines,
    "End of briefing.",
  ].join("\n\n");
}

export async function exchangeAudio(market: Market) {
  const { voice, rate } = await savedOptions();
  return cachedAudio(await buildExchangeScript(market), voice, rate);
}
