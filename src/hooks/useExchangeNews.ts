"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Reaction = {
  status: "confirmed" | "muted" | "pending" | "unknown";
  change?: number;
  typical?: number;
  volumeRatio?: number | null;
  live?: boolean;
};

export type CompanyNews = {
  id: number;
  ticker: string;
  company: string | null;
  title: string;
  category: string;
  impact: "High" | "Medium" | "Low";
  impactScore: number;
  priceSensitive: boolean;
  sentiment: string;
  url: string;
  publishedAt: string;
  reaction: Reaction | null;
};

const STALE_MS = 20 * 60 * 1000;

export function useExchangeNews(market: "asx" | "us") {
  const [items, setItems] = useState<CompanyNews[]>([]);
  const [lastRefresh, setLastRefresh] = useState<{ at: string } | null>(null);
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "confirmed" | "high">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [script, setScript] = useState("");
  const [recording, setRecording] = useState(false);

  const load = useCallback(
    () =>
      api(`/api/exchange/${market}?all=${all}`).then((d) => {
        setItems(d.items);
        setLastRefresh(d.lastRefresh);
        return d;
      }),
    [market, all],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      await api(`/api/exchange/${market}`, { method: "POST" });
      setAudioUrl("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [market, load]);

  useEffect(() => {
    load()
      .then((d) => {
        if (!d.lastRefresh || Date.now() - Date.parse(d.lastRefresh.at) > STALE_MS) refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load, refresh]);

  const listen = async () => {
    setRecording(true);
    setError("");
    try {
      setScript((await api(`/api/exchange/${market}/audio?script=true`)).script);
      const res = await fetch(`/api/exchange/${market}/audio`);
      if (!res.ok) throw new Error((await res.json()).error);
      setAudioUrl(URL.createObjectURL(await res.blob()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRecording(false);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (filter === "all" || (filter === "high" ? i.impact === "High" : i.reaction?.status === "confirmed")) &&
      (!q || `${i.ticker} ${i.company ?? ""} ${i.title}`.toLowerCase().includes(q)),
  );

  return {
    items: visible,
    total: items.length,
    confirmed: items.filter((i) => i.reaction?.status === "confirmed").length,
    high: items.filter((i) => i.impact === "High").length,
    lastRefresh,
    loading,
    refreshing,
    error,
    refresh,
    filters: { all, setAll, filter, setFilter, search, setSearch },
    briefing: { audioUrl, script, recording, listen },
  };
}
