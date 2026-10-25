"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type MatchStatus = {
  total: number;
  matched: number;
  pending: number;
  withHeadlines: number;
  withEvent: number;
  macroConfigured: boolean;
  macroEvents: number;
  macroInfo: { matched: string[]; missing: string[] } | null;
};

export function useNewsMatch(onChange: () => void) {
  const [status, setStatus] = useState<MatchStatus | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const running = useRef(false);

  const refresh = useCallback(() => api("/api/news/match").then((s: MatchStatus) => (setStatus(s), s)), []);

  const run = useCallback(
    async (reset = false) => {
      if (running.current) return;
      running.current = true;
      setError("");
      try {
        const total = reset ? (status?.total ?? 0) : (status?.pending ?? 0);
        let done = 0;
        setProgress({ done, total });
        let res = await api(`/api/news/match${reset ? "?reset=true" : ""}`, { method: "POST" });
        done += res.processed;
        setProgress({ done, total: Math.max(total, done + res.remaining) });
        while (res.remaining > 0 && !res.errors.length && res.processed > 0) {
          res = await api("/api/news/match", { method: "POST" });
          done += res.processed;
          setProgress({ done, total: Math.max(total, done + res.remaining) });
        }
        if (res.errors.length) setError(res.errors.join(" "));
        await refresh();
        onChange();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        running.current = false;
        setProgress(null);
      }
    },
    [status, refresh, onChange],
  );

  useEffect(() => {
    refresh()
      .then((s) => {
        if (s.pending > 0 && s.pending <= 5) run();
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, progress, error, run };
}
