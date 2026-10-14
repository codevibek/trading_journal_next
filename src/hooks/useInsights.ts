"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { BREAKEVEN_WIN_RATE, hasFeatures, rOf, RISK_USD, type Features, type Trade } from "@/lib/trading";

export type Bucket = { label: string; n: number; wins: number; winRate: number; low: number; high: number; expR: number; verdict: "edge" | "leak" | "unclear" | "few" };
export type Dimension = { title: string; hint: string; buckets: Bucket[] };

const MIN_N = 10;

function wilson(wins: number, n: number, z = 1.96) {
  if (!n) return [0, 1];
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}

function summarise(label: string, trades: Trade[]): Bucket {
  const decided = trades.filter((t) => t.outcome !== "be");
  const wins = decided.filter((t) => t.outcome === "win").length;
  const [low, high] = wilson(wins, decided.length);
  const verdict = decided.length < MIN_N ? "few" : low > BREAKEVEN_WIN_RATE ? "edge" : high < BREAKEVEN_WIN_RATE ? "leak" : "unclear";
  return {
    label,
    n: trades.length,
    wins,
    winRate: decided.length ? wins / decided.length : 0,
    low,
    high,
    expR: trades.length ? trades.reduce((s, t) => s + rOf(t.outcome), 0) / trades.length : 0,
    verdict,
  };
}

function groupBy(trades: Trade[], key: (t: Trade, f: Features) => string | null, order?: string[]) {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = hasFeatures(t) ? key(t, t.features!) : null;
    if (k == null) continue;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const labels = order ? order.filter((o) => groups.has(o)) : [...groups.keys()].sort();
  return labels.map((l) => summarise(l, groups.get(l)!));
}

const tercile = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return [s[Math.floor(s.length / 3)], s[Math.floor((2 * s.length) / 3)]];
};

export function useInsights() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState("All");
  const running = useRef(false);

  const load = useCallback(
    () =>
      api("/api/trades").then((data) => {
        setTrades(data.trades);
        return data.trades as Trade[];
      }),
    [],
  );

  const analyse = useCallback(async (reset = false) => {
    if (running.current) return;
    running.current = true;
    setError("");
    try {
      let res = await api(`/api/insights/enrich${reset ? "?reset=true" : ""}`, { method: "POST" });
      const total = res.processed + res.remaining;
      let done = res.processed;
      setProgress({ done, total });
      while (res.remaining > 0 && !res.errors.length) {
        res = await api("/api/insights/enrich", { method: "POST" });
        done += res.processed;
        setProgress({ done, total });
        if (!res.processed) break;
      }
      if (res.errors.length) setError(res.errors.join(" "));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      running.current = false;
      setProgress(null);
    }
  }, [load]);

  useEffect(() => {
    load()
      .then((list) => {
        if (list.some((t) => !t.features)) analyse();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load, analyse]);

  const pending = trades.filter((t) => !t.features).length;

  const strategies = useMemo(() => [...new Set(trades.map((t) => t.strategy))].sort(), [trades]);
  const scoped = useMemo(() => trades.filter((t) => strategy === "All" || t.strategy === strategy), [trades, strategy]);

  const dimensions = useMemo<Dimension[]>(() => {
    const ready = scoped.filter(hasFeatures);
    if (!ready.length) return [];
    const [atrLow, atrHigh] = tercile(ready.map((t) => t.features!.atrPct));
    const aligned = (t: Trade, dir: "up" | "down") => ((t.side === "long") === (dir === "up") ? "With the trend" : "Against the trend");

    const dims: Dimension[] = [
      { title: "Session", hint: "When you entered, by UTC trading session", buckets: groupBy(ready, (_, f) => f.session, ["Asia", "London", "London/NY overlap", "New York", "Late US"]) },
      { title: "1 hour trend", hint: "20 vs 50 EMA on the last closed 1h candles", buckets: groupBy(ready, (t, f) => aligned(t, f.trend1h), ["With the trend", "Against the trend"]) },
      { title: "4 hour trend", hint: "20 vs 50 EMA on the last closed 4h candles", buckets: groupBy(ready, (t, f) => aligned(t, f.trend4h), ["With the trend", "Against the trend"]) },
      {
        title: "RSI on the signal candle",
        hint: "14-period RSI of the 15m candle before entry",
        buckets: groupBy(ready, (_, f) => (f.rsi15 < 30 ? "Below 30" : f.rsi15 < 45 ? "30 to 45" : f.rsi15 <= 55 ? "45 to 55" : f.rsi15 <= 70 ? "55 to 70" : "Above 70"), ["Below 30", "30 to 45", "45 to 55", "55 to 70", "Above 70"]),
      },
      {
        title: "Volatility",
        hint: "15m ATR as a share of price, split into thirds of your trades",
        buckets: groupBy(ready, (_, f) => (f.atrPct < atrLow ? "Quiet" : f.atrPct < atrHigh ? "Normal" : "Volatile"), ["Quiet", "Normal", "Volatile"]),
      },
      {
        title: "Volume on the signal candle",
        hint: "Compared with the 20 candles before it",
        buckets: groupBy(ready, (_, f) => (f.volumeRatio < 0.8 ? "Below average" : f.volumeRatio <= 1.5 ? "Average" : "Spike"), ["Below average", "Average", "Spike"]),
      },
      {
        title: "Signal candle colour",
        hint: "Did the last closed candle agree with your direction?",
        buckets: groupBy(ready, (t, f) => ((t.side === "long") === (f.signalCandle === "green") ? "Agreed" : "Disagreed"), ["Agreed", "Disagreed"]),
      },
      {
        title: "News in the 2 hours before",
        hint: "Only trades after the app started saving news",
        buckets: groupBy(ready, (_, f) => (f.newsHighBefore == null ? null : f.newsHighBefore > 0 ? "High-impact news" : "No major news"), ["High-impact news", "No major news"]),
      },
      { title: "Direction", hint: "", buckets: groupBy(ready, (t) => (t.side === "long" ? "Long" : "Short"), ["Long", "Short"]) },
      { title: "Day of week", hint: "In your local timezone", buckets: groupBy(ready, (_, f) => f.weekday, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) },
    ];
    if (strategy === "All" && strategies.length > 1) {
      dims.unshift({ title: "Strategy", hint: "", buckets: strategies.map((s) => summarise(s, ready.filter((t) => t.strategy === s))) });
    }
    return dims.filter((d) => d.buckets.length);
  }, [scoped, strategy, strategies]);

  const overall = summarise("All", scoped);

  return {
    loading,
    error,
    progress,
    pending,
    analyse,
    strategies,
    strategy,
    setStrategy,
    overall: { ...overall, totalUsd: overall.expR * overall.n * RISK_USD },
    offCandle: scoped.filter((t) => hasFeatures(t) && !t.features!.entryInRange).length,
    analysed: scoped.filter(hasFeatures).length,
    dimensions,
  };
}
