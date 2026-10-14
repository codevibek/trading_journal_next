import { query } from "./db";
import { atr, emaSeries, macd, rsi, trend, type Candle } from "./indicators";
import { DEFAULT_WATCHLIST, TIMEFRAMES, type Instrument, type Reason, type Signal, type Timeframe } from "./instruments";
import { candles } from "./market";
import { refreshNews } from "./news";
import { REWARD_R } from "./trading";

const CACHE_MINUTES = 15;
const NEWS_REFRESH_MINUTES = 30;

export async function getWatchlist(): Promise<Instrument[]> {
  const [row] = await query(`SELECT value FROM settings WHERE key = 'watchlist'`);
  return row?.value ?? DEFAULT_WATCHLIST;
}

export async function saveWatchlist(list: Instrument[]) {
  await query(
    `INSERT INTO settings (key, value) VALUES ('watchlist', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(list)],
  );
  await query(`DELETE FROM signal_cache`);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const matcher = (inst: Instrument) => new RegExp(`(^|[^a-z0-9])(${inst.aliases.map(escape).join("|")})([^a-z0-9]|$)`, "i");

async function recentArticles(hours = 24) {
  return query(
    `SELECT id, source, title, summary, link, published_at AS "publishedAt", sentiment, sentiment_score AS "sentimentScore",
            impact_score AS "impactScore", impact_level AS "impactLevel", is_crypto AS "isCrypto"
     FROM news_articles WHERE published_at > now() - make_interval(hours => $1::int) ORDER BY impact_score DESC`,
    [hours],
  );
}

export function newsFor(inst: Instrument, articles: any[]) {
  const re = matcher(inst);
  return articles.filter((a) => re.test(`${a.title} ${a.summary ?? ""}`));
}

function newsQuery(inst: Instrument) {
  if (inst.kind === "stock") return `${inst.name} stock`;
  if (inst.kind === "crypto") return `${inst.name} price`;
  if (inst.kind === "commodity") return `${inst.name} price`;
  return inst.name;
}

async function refreshInstrumentNews(list: Instrument[]) {
  const [row] = await query(`SELECT value FROM settings WHERE key = 'instrument_news_at'`);
  if (row && Date.now() - Date.parse(row.value) < NEWS_REFRESH_MINUTES * 60e3) return;
  const feeds = Object.fromEntries(
    list.map((i) => [`google_news_${i.id}`, `https://news.google.com/rss/search?q=${encodeURIComponent(newsQuery(i))}+when:1d&hl=en-US&gl=US&ceid=US:en`]),
  );
  await refreshNews(feeds, 10).catch(() => {});
  await query(
    `INSERT INTO settings (key, value) VALUES ('instrument_news_at', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(new Date().toISOString())],
  );
}

function priceDayAgo(c: Candle[]) {
  const target = c[c.length - 1].t - 86400e3;
  for (let i = c.length - 1; i >= 0; i--) if (c[i].t <= target) return c[i].c;
  return c[0].c;
}

const fmt = (n: number, d: number) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function analyse(inst: Instrument, tf: Timeframe, c: Candle[], higher: Candle[], news: any[]): Signal {
  if (c.length < 60) throw new Error("Not enough price history");
  const closes = c.map((x) => x.c);
  const price = closes[closes.length - 1];
  const tfLabel = TIMEFRAMES.find((t) => t.id === tf)!;
  const higherLabel = tfLabel.higher === "1d" ? "daily" : tfLabel.higher === "1w" ? "weekly" : "1 hour";

  const ema20 = emaSeries(closes, 20).at(-1)!;
  const ema50 = emaSeries(closes, 50).at(-1)!;
  const ema200 = closes.length >= 200 ? emaSeries(closes, 200).at(-1)! : null;
  const r = rsi(closes);
  const m = macd(closes);
  const a = atr(c.slice(-100));
  const window = c.slice(-51, -1);
  const support = Math.min(...window.map((x) => x.l));
  const resistance = Math.max(...window.map((x) => x.h));
  const higherTrend = higher.length >= 50 ? trend(higher.map((x) => x.c)) : null;

  const parts: { w: number; v: number; reason: Reason }[] = [];
  const up = ema20 >= ema50;
  parts.push({ w: 2, v: up ? 1 : -1, reason: { tone: up ? "bull" : "bear", text: `${tfLabel.label} trend is ${up ? "up" : "down"}: the 20 EMA is ${up ? "above" : "below"} the 50 EMA.` } });

  if (higherTrend) {
    const hu = higherTrend === "up";
    parts.push({ w: 2, v: hu ? 1 : -1, reason: { tone: hu ? "bull" : "bear", text: `The ${higherLabel} trend is ${hu ? "up" : "down"}, ${hu === up ? "agreeing with" : "against"} the ${tfLabel.label} trend.` } });
  }

  if (ema200 != null) {
    const above = price >= ema200;
    parts.push({ w: 1, v: above ? 1 : -1, reason: { tone: above ? "bull" : "bear", text: `Price is ${above ? "above" : "below"} the 200 EMA (${fmt(ema200, inst.decimals)}).` } });
  }

  const rising = m.hist > m.prevHist;
  const mv = m.hist > 0 ? (rising ? 1 : 0.5) : rising ? -0.5 : -1;
  parts.push({
    w: 1.5,
    v: mv,
    reason: { tone: mv > 0 ? "bull" : "bear", text: `MACD momentum is ${m.hist > 0 ? "positive" : "negative"} and ${rising ? "strengthening" : "fading"}${(m.hist > 0) !== rising ? ", so it may be turning" : ""}.` },
  });

  const rv = r > 70 ? -1 : r < 30 ? 1 : r >= 55 ? 0.5 : r <= 45 ? -0.5 : 0;
  const rText = r > 70 ? "overbought, so a pullback is more likely" : r < 30 ? "oversold, so a bounce is more likely" : r >= 55 ? "showing bullish momentum" : r <= 45 ? "showing bearish momentum" : "neutral";
  parts.push({ w: 1, v: rv, reason: { tone: rv > 0 ? "bull" : rv < 0 ? "bear" : "neutral", text: `RSI is ${r.toFixed(0)}, ${rText}.` } });

  let newsSentiment: number | null = null;
  if (news.length) {
    const weight = news.reduce((s, n) => s + Math.max(n.impactScore, 10), 0);
    newsSentiment = news.reduce((s, n) => s + (n.sentimentScore ?? 0) * Math.max(n.impactScore, 10), 0) / weight;
    const tone = newsSentiment > 0.1 ? "bull" : newsSentiment < -0.1 ? "bear" : "neutral";
    parts.push({
      w: news.length >= 3 ? 2 : 1,
      v: Math.max(-1, Math.min(1, newsSentiment * 2)),
      reason: { tone, text: `${news.length} news ${news.length === 1 ? "story" : "stories"} in the last 24 hours, ${tone === "bull" ? "mostly positive" : tone === "bear" ? "mostly negative" : "mixed"} in tone.` },
    });
  } else {
    parts.push({ w: 0, v: 0, reason: { tone: "neutral", text: "No news about it in the last 24 hours." } });
  }

  const total = parts.reduce((s, p) => s + p.w, 0);
  const score = Math.round((parts.reduce((s, p) => s + p.w * p.v, 0) / total) * 100);
  const verdict = score >= 60 ? "Strong buy" : score >= 25 ? "Buy" : score <= -60 ? "Strong sell" : score <= -25 ? "Sell" : "Neutral";
  const dir = score >= 25 ? 1 : score <= -25 ? -1 : 0;
  const stopDist = 1.5 * a;

  return {
    id: inst.id,
    name: inst.name,
    kind: inst.kind,
    decimals: inst.decimals,
    timeframe: tf,
    price,
    change24h: price / priceDayAgo(c) - 1,
    score,
    verdict,
    reasons: parts.map((p) => p.reason),
    technicals: { rsi: r, trend: up ? "up" : "down", higherTrend, aboveEma200: ema200 == null ? null : price >= ema200, macdHist: m.hist, macdRising: rising, atr: a, support, resistance },
    news: { count: news.length, sentiment: newsSentiment },
    levels: dir ? { entry: price, stop: price - dir * stopDist, target: price + dir * stopDist * REWARD_R } : null,
    spark: closes.slice(-48),
    computedAt: new Date().toISOString(),
  };
}

async function compute(inst: Instrument, tf: Timeframe, articles: any[]) {
  const higherTf = TIMEFRAMES.find((t) => t.id === tf)!.higher;
  const [c, h] = await Promise.all([candles(inst, tf, 300), candles(inst, higherTf, 120)]);
  return { signal: analyse(inst, tf, c, h, newsFor(inst, articles)), candles: c };
}

export async function getSignals(tf: Timeframe, force = false) {
  const list = await getWatchlist();
  const cached = force
    ? []
    : await query(`SELECT key, data FROM signal_cache WHERE key = ANY($1) AND computed_at > now() - make_interval(mins => $2::int)`, [
        list.map((i) => `${i.id}:${tf}`),
        CACHE_MINUTES,
      ]);
  const byKey = new Map(cached.map((r: any) => [r.key, r.data as Signal]));
  const missing = list.filter((i) => !byKey.has(`${i.id}:${tf}`));

  if (missing.length) {
    await refreshInstrumentNews(list);
    const articles = await recentArticles();
    const results = await Promise.allSettled(missing.map((i) => compute(i, tf, articles)));
    for (const [n, res] of results.entries()) {
      const inst = missing[n];
      if (res.status === "fulfilled") {
        byKey.set(`${inst.id}:${tf}`, res.value.signal);
        await query(
          `INSERT INTO signal_cache (key, data, computed_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, computed_at = now()`,
          [`${inst.id}:${tf}`, JSON.stringify(res.value.signal)],
        );
      } else {
        byKey.set(`${inst.id}:${tf}`, { id: inst.id, name: inst.name, kind: inst.kind, error: (res.reason as Error).message } as Signal);
      }
    }
  }
  return list.map((i) => byKey.get(`${i.id}:${tf}`)!);
}

export async function getDetail(id: string, tf: Timeframe) {
  const inst = (await getWatchlist()).find((i) => i.id === id);
  if (!inst) return null;
  const articles = await recentArticles();
  const { signal, candles: c } = await compute(inst, tf, articles);
  const closes = c.map((x) => x.c);
  const e20 = emaSeries(closes, 20);
  const e50 = emaSeries(closes, 50);
  const from = Math.max(0, c.length - 120);
  return {
    instrument: inst,
    signal,
    chart: c.slice(from).map((x, i) => ({ t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, ema20: e20[from + i], ema50: e50[from + i] })),
    news: newsFor(inst, articles).slice(0, 12),
  };
}

const THEMES: Record<string, string[]> = {
  "the Fed and interest rates": ["fed", "fomc", "rate cut", "rate hike", "interest rates", "powell", "federal reserve"],
  inflation: ["inflation", "cpi", "ppi"],
  "jobs and growth": ["jobs report", "payrolls", "unemployment", "recession", "gdp"],
  "crypto ETFs and flows": ["etf", "inflows", "outflows", "blackrock"],
  "regulation and lawsuits": ["sec", "lawsuit", "regulator", "ban", "antitrust"],
  "company earnings": ["earnings", "beats estimates", "misses estimates", "guidance", "revenue"],
  "hacks and exploits": ["hack", "hacked", "exploit"],
  "trade and geopolitics": ["tariff", "sanctions", "war", "china"],
};

export async function marketSummary() {
  const articles = await recentArticles();
  const list = await getWatchlist();
  const meaningful = articles.filter((a) => a.impactLevel !== "Low");
  const pos = meaningful.filter((a) => a.sentiment === "Positive").length;
  const neg = meaningful.filter((a) => a.sentiment === "Negative").length;
  const avg = meaningful.length ? meaningful.reduce((s, a) => s + (a.sentimentScore ?? 0), 0) / meaningful.length : 0;
  const mood = avg > 0.08 ? "positive" : avg < -0.08 ? "negative" : "mixed";

  const themes = Object.entries(THEMES)
    .map(([name, words]) => {
      const re = new RegExp(`\\b(${words.map(escape).join("|")})\\b`, "i");
      const hits = meaningful.filter((a) => re.test(`${a.title} ${a.summary ?? ""}`));
      const s = hits.length ? hits.reduce((t, a) => t + (a.sentimentScore ?? 0), 0) / hits.length : 0;
      return { name, count: hits.length, tone: s > 0.08 ? "positive" : s < -0.08 ? "negative" : "mixed" };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const mentions = list
    .map((i) => ({ id: i.id, name: i.name, count: newsFor(i, articles).length }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sentences = [
    meaningful.length
      ? `News over the last 24 hours leans ${mood}: ${neg} negative and ${pos} positive stories among ${meaningful.length} medium and high impact headlines.`
      : "There isn't enough medium or high impact news in the last 24 hours to read the mood.",
    themes.length ? `The main themes are ${themes.map((t) => `${t.name} (${t.count} ${t.count === 1 ? "story" : "stories"}, ${t.tone})`).join(", ")}.` : "",
    mentions.length ? `Most mentioned on your watchlist: ${mentions.map((m) => `${m.name} ${m.count}×`).join(", ")}.` : "",
  ].filter(Boolean);

  return { mood, positive: pos, negative: neg, total: articles.length, themes, mentions, sentences, top: articles.slice(0, 3) };
}
