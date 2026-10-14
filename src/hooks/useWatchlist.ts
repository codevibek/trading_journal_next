"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { slugify, type Instrument, type Kind } from "@/lib/instruments";

export type Draft = { name: string; kind: Kind; ticker: string };

const DECIMALS: Record<Kind, number> = { crypto: 2, stock: 2, index: 2, forex: 4, commodity: 2 };

export function useWatchlist(onSaved: () => void) {
  const [list, setList] = useState<Instrument[]>([]);
  const [defaults, setDefaults] = useState<Instrument[]>([]);
  const [draft, setDraft] = useState<Draft>({ name: "", kind: "stock", ticker: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/watchlist").then((d) => {
      setList(d.watchlist);
      setDefaults(d.defaults);
    });
  }, []);

  const save = async (next: Instrument[]) => {
    setSaving(true);
    setError("");
    try {
      setList((await api("/api/watchlist", { method: "PUT", json: { watchlist: next } })).watchlist);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const add = () => {
    const ticker = draft.ticker.trim().toUpperCase();
    if (!ticker || !draft.name.trim()) return setError("Give it a name and a ticker.");
    const id = slugify(ticker);
    if (list.some((i) => i.id === id)) return setError("That's already on your watchlist.");
    const inst: Instrument = {
      id,
      name: draft.name.trim(),
      kind: draft.kind,
      source: draft.kind === "crypto" ? "binance" : "yahoo",
      ticker,
      aliases: [draft.name.trim().toLowerCase(), ticker.toLowerCase().replace(/usdt$|=x$/, "")],
      decimals: DECIMALS[draft.kind],
    };
    setDraft({ name: "", kind: draft.kind, ticker: "" });
    save([...list, inst]);
  };

  return {
    list,
    draft,
    setDraft: (patch: Partial<Draft>) => setDraft({ ...draft, ...patch }),
    add,
    remove: (id: string) => save(list.filter((i) => i.id !== id)),
    reset: () => save(defaults),
    saving,
    error,
  };
}
