"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Article = {
  id: number;
  source: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  sentiment: "Positive" | "Negative" | "Neutral";
  impactScore: number;
  impactLevel: "High" | "Medium" | "Low";
  isCrypto: boolean;
};

const STALE_MS = 30 * 60 * 1000;

export function useNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [failedFeeds, setFailedFeeds] = useState<string[]>([]);
  const [cryptoOnly, setCryptoOnly] = useState(false);
  const [level, setLevel] = useState<"All" | "High" | "Medium">("All");
  const [search, setSearch] = useState("");

  const load = useCallback(
    () =>
      api(`/api/news?hours=24`).then((data) => {
        setArticles(data.articles);
        setLastFetchedAt(data.lastFetchedAt);
        return data;
      }),
    [],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await api("/api/news/refresh", { method: "POST" });
      setFailedFeeds(res.failed);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load()
      .then((data) => {
        const age = data.lastFetchedAt ? Date.now() - Date.parse(data.lastFetchedAt) : Infinity;
        if (age > STALE_MS) refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load, refresh]);

  const q = search.trim().toLowerCase();
  const visible = articles.filter(
    (a) =>
      (!cryptoOnly || a.isCrypto) &&
      (level === "All" || (level === "High" ? a.impactLevel === "High" : a.impactLevel !== "Low")) &&
      (!q || a.title.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q)),
  );

  return {
    articles: visible,
    total: articles.length,
    highCount: articles.filter((a) => a.impactLevel === "High").length,
    lastFetchedAt,
    loading,
    refreshing,
    error,
    failedFeeds,
    refresh,
    filters: { cryptoOnly, setCryptoOnly, level, setLevel, search, setSearch },
  };
}
