export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number; closeTime: number };

export function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) prev = values[i] * k + prev * (1 - k);
  return prev;
}

export function rsi(closes: number[], period = 14) {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

export function atr(candles: Candle[], period = 14) {
  const tr = candles.slice(1).map((c, i) => {
    const prevClose = candles[i].c;
    return Math.max(c.h - c.l, Math.abs(c.h - prevClose), Math.abs(c.l - prevClose));
  });
  let value = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) value = (value * (period - 1) + tr[i]) / period;
  return value;
}

export const trend = (closes: number[]) => (ema(closes, 20) >= ema(closes, 50) ? "up" : "down") as "up" | "down";

export function emaSeries(values: number[], period: number) {
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) out[i] = prev = values[i] * k + prev * (1 - k);
  return out;
}

export function macd(closes: number[]) {
  const fast = emaSeries(closes, 12);
  const slow = emaSeries(closes, 26);
  const line = closes.map((_, i) => fast[i] - slow[i]).filter((v) => !isNaN(v));
  const signal = emaSeries(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line: line.at(-1)!, signal: signal.at(-1)!, hist: hist.at(-1)!, prevHist: hist.at(-2)! };
}
