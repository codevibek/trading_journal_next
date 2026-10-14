"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { rOf, RISK_USD, type Trade } from "@/lib/trading";

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState("All");
  const [outcome, setOutcome] = useState<"all" | "win" | "loss">("all");

  const reload = useCallback(
    () =>
      api("/api/trades")
        .then((data) => setTrades(data.trades))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const strategies = useMemo(() => [...new Set(trades.map((t) => t.strategy))].sort(), [trades]);

  const visible = trades.filter(
    (t) => (strategy === "All" || t.strategy === strategy) && (outcome === "all" || t.outcome === outcome),
  );

  const equity = useMemo(
    () =>
      [...trades]
        .sort((a, b) => Date.parse(a.entryTime) - Date.parse(b.entryTime))
        .reduce<{ time: string; r: number }[]>((acc, t) => {
          acc.push({ time: t.entryTime, r: (acc.at(-1)?.r ?? 0) + rOf(t.outcome) });
          return acc;
        }, []),
    [trades],
  );

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = trades.filter((t) => Date.parse(t.entryTime) >= monthStart);

  const totalR = visible.reduce((sum, t) => sum + rOf(t.outcome), 0);
  const wins = visible.filter((t) => t.outcome === "win").length;
  const decided = visible.filter((t) => t.outcome !== "be").length;

  return {
    trades: visible,
    loading,
    error,
    reload,
    strategies,
    filters: { strategy, setStrategy, outcome, setOutcome },
    all: trades,
    equity,
    thisMonth: { count: thisMonth.length, r: thisMonth.reduce((sum, t) => sum + rOf(t.outcome), 0) },
    stats: {
      count: visible.length,
      winRate: decided ? wins / decided : 0,
      totalR,
      totalUsd: totalR * RISK_USD,
    },
  };
}
