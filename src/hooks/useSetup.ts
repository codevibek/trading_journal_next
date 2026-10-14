"use client";

import { useEffect, useState } from "react";

type Health = { ok: boolean; configured: boolean; error?: string };

export function useSetup() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.status === 401 ? { ok: true, configured: true } : r.json()))
      .then(setHealth)
      .catch(() => setHealth({ ok: false, configured: true, error: "The app server isn't responding." }));
  }, []);

  return { checking: !health, ready: !!health?.ok, configured: health?.configured ?? true, error: health?.error };
}
