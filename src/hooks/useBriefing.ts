"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type BriefingSettings = {
  items: number;
  minImpact: number;
  summaries: boolean;
  cryptoOnly: boolean;
  voice: string;
  rate: number;
};

export const VOICES = [
  { id: "en-AU-NatashaNeural", label: "Natasha (AU)" },
  { id: "en-AU-WilliamNeural", label: "William (AU)" },
  { id: "en-US-AriaNeural", label: "Aria (US)" },
  { id: "en-US-GuyNeural", label: "Guy (US)" },
  { id: "en-GB-SoniaNeural", label: "Sonia (UK)" },
];

const toQuery = (s: BriefingSettings) =>
  new URLSearchParams(Object.entries(s).map(([k, v]) => [k, String(v)])).toString();

export function useBriefing() {
  const [settings, setSettings] = useState<BriefingSettings | null>(null);
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/settings").then(setSettings).catch((e) => setError(e.message));
  }, []);

  const updateSettings = (patch: Partial<BriefingSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setAudioUrl("");
    api("/api/settings", { method: "PUT", json: next }).catch(() => {});
  };

  const generate = async () => {
    if (!settings) return;
    setLoading(true);
    setError("");
    try {
      const q = toQuery(settings);
      const { script } = await api(`/api/briefing?${q}`);
      setScript(script);
      const res = await fetch(`/api/briefing/audio?${q}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: "Morning briefing", artist: "Trade Desk" });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { settings, updateSettings, script, audioUrl, loading, error, generate };
}
