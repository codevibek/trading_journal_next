import type { Candle } from "./indicators";
import type { Instrument } from "./instruments";

const BINANCE = process.env.BINANCE_BASE_URL || "https://data-api.binance.vision";
const YAHOO = process.env.YAHOO_BASE_URL || "https://query1.finance.yahoo.com";

const YAHOO_PARAMS: Record<string, { interval: string; range: string }> = {
  "15m": { interval: "15m", range: "30d" },
  "1h": { interval: "60m", range: "6mo" },
  "1d": { interval: "1d", range: "2y" },
  "1w": { interval: "1wk", range: "10y" },
};

async function binance(ticker: string, interval: string, limit: number): Promise<Candle[]> {
  const res = await fetch(`${BINANCE}/api/v3/klines?symbol=${ticker}&interval=${interval}&limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Binance returned ${res.status} for ${ticker}`);
  const rows: any[][] = await res.json();
  return rows.map((r) => ({ t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5], closeTime: r[6] }));
}

async function yahoo(ticker: string, interval: string, limit: number): Promise<Candle[]> {
  const p = YAHOO_PARAMS[interval];
  const res = await fetch(`${YAHOO}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${p.interval}&range=${p.range}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${ticker}`);
  const result = (await res.json())?.chart?.result?.[0];
  const q = result?.indicators?.quote?.[0];
  if (!result?.timestamp || !q) throw new Error(`No price data for ${ticker}`);
  const candles: Candle[] = [];
  result.timestamp.forEach((ts: number, i: number) => {
    if (q.close[i] == null || q.open[i] == null) return;
    candles.push({ t: ts * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume?.[i] ?? 0, closeTime: ts * 1000 });
  });
  return candles.slice(-limit);
}

export function candles(inst: Instrument, interval: string, limit = 300) {
  return inst.source === "binance" ? binance(inst.ticker, interval, limit) : yahoo(inst.ticker, interval, limit);
}
