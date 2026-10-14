import Parser from "rss-parser";
import { query } from "./db";
import { scoreImpact } from "./impact";

export const FEEDS: Record<string, string> = {
  coindesk: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  cointelegraph: "https://cointelegraph.com/rss",
  decrypt: "https://decrypt.co/feed",
  google_news_bitcoin: "https://news.google.com/rss/search?q=bitcoin&hl=en-US&gl=US&ceid=US:en",
  cnbc_markets: "https://www.cnbc.com/id/20910258/device/rss/rss.html",
  cnbc_finance: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
  marketwatch_topstories: "https://feeds.marketwatch.com/marketwatch/topstories/",
  marketwatch_realtime: "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/",
  investing_com: "https://www.investing.com/rss/news.rss",
  yahoo_finance: "https://finance.yahoo.com/news/rssindex",
  nasdaq_original: "https://www.nasdaq.com/feed/nasdaq-original/rss.xml",
};

for (const pair of (process.env.EXTRA_FEEDS ?? "").split(",").filter(Boolean)) {
  const [name, ...url] = pair.split("=");
  FEEDS[name.trim()] = url.join("=").trim();
}

const parser = new Parser({ timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 TradeDesk" } });

export function cleanText(text = "", max = 300) {
  let t = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + ".";
  return t;
}

export async function fetchFeed(source: string, url: string, limit = 15) {
  const feed = await parser.parseURL(url);
  return feed.items.slice(0, limit).map((item) => {
    const title = cleanText(item.title, 300);
    const summary = cleanText(item.contentSnippet || item.content || item.summary, 300);
    const impact = scoreImpact(title, summary);
    const published = item.isoDate || item.pubDate;
    return {
      source,
      title,
      summary,
      link: item.link || title,
      publishedAt: published && !isNaN(Date.parse(published)) ? new Date(published) : null,
      ...impact,
    };
  });
}

export async function refreshNews() {
  const results = await Promise.allSettled(Object.entries(FEEDS).map(([name, url]) => fetchFeed(name, url)));
  const failed: string[] = [];
  let inserted = 0;

  for (const [i, r] of results.entries()) {
    if (r.status === "rejected") {
      failed.push(Object.keys(FEEDS)[i]);
      continue;
    }
    for (const a of r.value) {
      const rows = await query(
        `INSERT INTO news_articles (link, source, title, summary, published_at, sentiment, sentiment_score, impact_score, impact_level, is_crypto)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (link) DO NOTHING RETURNING id`,
        [a.link, a.source, a.title, a.summary, a.publishedAt ?? new Date(), a.sentiment, a.compound, a.score, a.level, a.isCrypto],
      );
      inserted += rows.length;
    }
  }
  return { inserted, failed };
}

export async function lastFetchedAt() {
  const [row] = await query(`SELECT max(fetched_at) AS t FROM news_articles`);
  return row?.t ? new Date(row.t) : null;
}

export async function recentNews({ hours = 24, minImpact = 0, cryptoOnly = false } = {}) {
  return query(
    `SELECT id, source, title, summary, link, published_at AS "publishedAt", sentiment,
            impact_score AS "impactScore", impact_level AS "impactLevel", is_crypto AS "isCrypto"
     FROM news_articles
     WHERE published_at > now() - make_interval(hours => $1::int)
       AND impact_score >= $2 AND ($3::boolean = false OR is_crypto)
     ORDER BY impact_score DESC, published_at DESC
     LIMIT 200`,
    [hours, minImpact, cryptoOnly],
  );
}
