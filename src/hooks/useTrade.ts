"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { uploadTradeImage } from "@/lib/image";
import type { Trade } from "@/lib/trading";

export type TradeDraft = {
  strategy: string;
  side: "long" | "short";
  outcome: "win" | "loss" | "be";
  entryTime: string;
  entryPrice: string;
  exitPrice: string;
  notes: string;
};

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const emptyDraft = (): TradeDraft => {
  const now = new Date();
  now.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
  return { strategy: "", side: "long", outcome: "win", entryTime: toLocalInput(now), entryPrice: "", exitPrice: "", notes: "" };
};

const toDraft = (t: Trade): TradeDraft => ({
  strategy: t.strategy,
  side: t.side,
  outcome: t.outcome,
  entryTime: toLocalInput(new Date(t.entryTime)),
  entryPrice: String(t.entryPrice),
  exitPrice: t.exitPrice == null ? "" : String(t.exitPrice),
  notes: t.notes ?? "",
});

export function useTrade(id?: number) {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([])
  const [draft, setDraft] = useState<TradeDraft>(emptyDraft);
  const [image, setImage] = useState<File | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api(`/api/trades/${id}`)
        .then((data) => {
          setTrade(data.trade);
          setNews(data.news);
          setEvents(data.events ?? []);
          setDraft(toDraft(data.trade));
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const update = (patch: Partial<TradeDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = { ...draft, entryTime: new Date(draft.entryTime).toISOString() };
      const savedId = id ?? (await api("/api/trades", { method: "POST", json: body })).id;
      if (id) await api(`/api/trades/${id}`, { method: "PATCH", json: body });
      if (image) await uploadTradeImage(savedId, image);
      setImage(null);
      setImageVersion((v) => v + 1);
      if (id) await load();
      return savedId as number;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    await api(`/api/trades/${id}`, { method: "DELETE" });
  };

  const removeImage = async () => {
    if (!id) return;
    await api(`/api/trades/${id}/image`, { method: "DELETE" });
    await load();
  };

  const imageSrc = trade?.hasImage ? `/api/trades/${id}/image?v=${imageVersion}` : trade?.imageUrl || null;

  return { trade, news, events, draft, update, image, setImage, imageSrc, loading, saving, error, save, remove, removeImage };
}
