"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Kind, Signal, Timeframe } from "@/lib/instruments";

export type Summary = {
  mood: "positive" | "negative" | "mixed";
  positive: number;
  negative: number;
  total: number;
  themes: { name: string; count: number; tone: string }[];
  sentences: string[];
  top: any[];
};

export function useSignals() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    (tf: Timeframe, refresh = false) =>
      Promise.all([api(`/api/signals?tf=${tf}${refresh ? "&refresh=true" : ""}`), api("/api/signals/summary")])
        .then(([s, sum]) => {
          setSignals(s.signals);
          setSummary(sum);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        }),
    [],
  );

  useEffect(() => {
    load(timeframe);
  }, [load, timeframe]);

  const changeTimeframe = (tf: Timeframe) => {
    setLoading(true);
    setTimeframe(tf);
  };

  const refresh = () => {
    setRefreshing(true);
    load(timeframe, true);
  };

  const ok = signals.filter((s) => !s.error && (kind === "all" || s.kind === kind || (kind === "stock" && s.kind === "index")));
  const byStrength = (a: Signal, b: Signal) => Math.abs(b.score) - Math.abs(a.score);

  return {
    timeframe,
    setTimeframe: changeTimeframe,
    kind,
    setKind,
    kinds: [...new Set(signals.filter((s) => !s.error).map((s) => (s.kind === "index" ? "stock" : s.kind)))] as Kind[],
    buys: ok.filter((s) => s.score >= 25).sort(byStrength),
    sells: ok.filter((s) => s.score <= -25).sort(byStrength),
    neutral: ok.filter((s) => s.score > -25 && s.score < 25).sort(byStrength),
    failed: signals.filter((s) => s.error),
    summary,
    loading,
    refreshing,
    error,
    refresh,
    reload: () => load(timeframe),
  };
}
