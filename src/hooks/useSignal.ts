"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Instrument, Signal, Timeframe } from "@/lib/instruments";

export type ChartBar = { t: number; o: number; h: number; l: number; c: number; ema20: number; ema50: number };

type Detail = { instrument: Instrument; signal: Signal; chart: ChartBar[]; news: any[] };

export function useSignal(id: string) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/signals/${id}?tf=${timeframe}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, timeframe]);

  return {
    ...data,
    timeframe,
    setTimeframe: (tf: Timeframe) => {
      setLoading(true);
      setTimeframe(tf);
    },
    loading,
    error,
  };
}
