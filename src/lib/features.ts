import { query } from "./db";
import { atr, rsi, trend, type Candle } from "./indicators";
import type { Features, Trade } from "./trading";

const BASE = process.env.BINANCE_BASE_URL || "https://data-api.binance.vision";
const SYMBOL = process.env.SYMBOL || "BTCUSDT";
const TIMEZONE = process.env.APP_TIMEZONE || "Australia/Sydney";
const M15 = 15 * 60 * 1000;

async function klines(
  interval: string,
  endTime: number,
  limit: number,
): Promise<Candle[]> {
  const url = `${BASE}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&endTime=${endTime}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok)
    throw new Error(
      `Price data request failed (${res.status}). ${res.status === 451 ? "Binance blocks this server's region; set BINANCE_BASE_URL." : ""}`,
    );
  const rows: any[][] = await res.json();
  return rows.map((r) => ({
    t: r[0],
    o: +r[1],
    h: +r[2],
    l: +r[3],
    c: +r[4],
    v: +r[5],
    closeTime: r[6],
  }));
}

export function sessionOf(date: Date) {
  const h = date.getUTCHours();
  if (h < 7) return "Asia";
  if (h < 12) return "London";
  if (h < 16) return "London/NY overlap";
  if (h < 21) return "New York";
  return "Late US";
}

async function newsContext(entry: Date) {
  const [first] = await query(
    `SELECT min(published_at) AS t FROM news_articles`,
  );
  if (!first?.t || new Date(first.t).getTime() > entry.getTime() - 2 * 3600e3)
    return { newsHighBefore: null, newsSentimentBefore: null };
  const [row] = await query(
    `SELECT count(*) FILTER (WHERE impact_level = 'High') AS high, avg(sentiment_score) AS sentiment
     FROM news_articles WHERE published_at BETWEEN $1::timestamptz - interval '2 hours' AND $1::timestamptz`,
    [entry],
  );
  return {
    newsHighBefore: Number(row.high),
    newsSentimentBefore: row.sentiment == null ? 0 : Number(row.sentiment),
  };
}

export async function computeFeatures(
  trade: Pick<Trade, "entryTime" | "entryPrice">,
): Promise<Features> {
  const entry = new Date(trade.entryTime);
  const candleOpen = Math.floor(entry.getTime() / M15) * M15;

  const [m15, h1, h4] = await Promise.all([
    klines("15m", candleOpen + M15 - 1, 200),
    klines("1h", candleOpen - 1, 120),
    klines("4h", candleOpen - 1, 120),
  ]);

  const closed = m15.filter((c) => c.t < candleOpen);
  const entryCandle = m15.find((c) => c.t === candleOpen);
  const closed1h = h1.filter((c) => c.closeTime < candleOpen);
  const closed4h = h4.filter((c) => c.closeTime < candleOpen);
  if (closed.length < 60 || closed1h.length < 55 || closed4h.length < 55)
    throw new Error("Not enough price history before this trade.");

  const last = closed[closed.length - 1];
  const normalRange = atr(closed.slice(-61, -1));
  const prev20 = closed.slice(-21, -1);
  const avgVol = prev20.reduce((a, c) => a + c.v, 0) / prev20.length;
  const p = trade.entryPrice;

  return {
    entryInRange:
      !!entryCandle && p >= entryCandle.l * 0.999 && p <= entryCandle.h * 1.001,
    session: sessionOf(entry),
    weekday: entry.toLocaleDateString("en-AU", {
      weekday: "short",
      timeZone: TIMEZONE,
    }),
    rsi15: Math.round(rsi(closed.map((c) => c.c)) * 10) / 10,
    trend15: trend(closed.map((c) => c.c)),
    trend1h: trend(closed1h.map((c) => c.c)),
    trend4h: trend(closed4h.map((c) => c.c)),
    atrPct: atr(closed.slice(-60)) / last.c,
    volumeRatio: avgVol ? last.v / avgVol : 1,
    signalCandle: last.c >= last.o ? "green" : "red",
    ...(await newsContext(entry)),
    signalRangeAtr: Math.round(((last.h - last.l) / normalRange) * 100) / 100,
    signalBodyAtr:
      Math.round((Math.abs(last.c - last.o) / normalRange) * 100) / 100,
  };
}

export async function enrichPending(batch = 8) {
  const pending = await query(
    `SELECT id, entry_time AS "entryTime", entry_price AS "entryPrice" FROM trades WHERE features IS NULL ORDER BY entry_time LIMIT $1`,
    [batch],
  );
  const errors: string[] = [];
  for (const t of pending) {
    try {
      await query(`UPDATE trades SET features = $2 WHERE id = $1`, [
        t.id,
        JSON.stringify(await computeFeatures(t)),
      ]);
    } catch (e) {
      errors.push((e as Error).message);
      if (/region|failed/.test((e as Error).message)) break;
      await query(
        `UPDATE trades SET features = '{"error": true}' WHERE id = $1`,
        [t.id],
      );
    }
  }
  const [{ n }] = await query(
    `SELECT count(*)::int AS n FROM trades WHERE features IS NULL`,
  );
  return {
    processed: pending.length,
    remaining: n,
    errors: [...new Set(errors)],
  };
}
