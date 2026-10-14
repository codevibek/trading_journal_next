"use client";

import { useState } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import { api } from "@/lib/api";
import { uploadTradeImage } from "@/lib/image";

export const FIELDS = [
  { key: "tradeDate", label: "Trade date", required: true, names: ["trade date", "date", "entry time", "entry date"] },
  { key: "side", label: "Trade type", required: true, names: ["trade type", "type", "side", "direction"] },
  { key: "outcome", label: "Result", required: true, names: ["pnl", "p&l", "result", "outcome"] },
  { key: "entryPrice", label: "Entry price", required: true, names: ["entry price", "entry"] },
  { key: "exitPrice", label: "Exit price", required: false, names: ["exit price", "exit"] },
  { key: "strategy", label: "Strategy", required: false, names: ["strategy", "setup"] },
  { key: "notes", label: "Notes", required: false, names: ["text", "notes", "comments", "journal"] },
  { key: "image", label: "Screenshot", required: false, names: ["image", "screenshot", "chart", "files"] },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Result = { index: number; ok: boolean; errors: string[]; warnings: string[]; id?: number; duplicate?: boolean; entryTime?: string };

const decode = (p: string) => {
  try {
    return decodeURIComponent(p).toLowerCase();
  } catch {
    return p.toLowerCase();
  }
};

const basename = (p: string) => p.split("/").pop() ?? p;

function findImage(images: Map<string, JSZip.JSZipObject>, ref: string) {
  const want = decode(ref);
  for (const [path, file] of images) if (path.endsWith(`/${want}`) || path === want) return file;
  const byName = [...images].filter(([path]) => basename(path) === basename(want));
  return byName.length === 1 ? byName[0][1] : undefined;
}

function autoMap(headers: string[]) {
  const map: Partial<Record<FieldKey, string>> = {};
  for (const f of FIELDS) {
    map[f.key] = headers.find((h) => (f.names as readonly string[]).includes(h.trim().toLowerCase()));
  }
  return map;
}

export function useCsvImport() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [images, setImages] = useState<Map<string, JSZip.JSZipObject>>(new Map());
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [dayFirst, setDayFirst] = useState(true);
  const [preview, setPreview] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<{ inserted: number; duplicates: number; images: number } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setPreview(null);
    setSummary(null);
    setError("");
  };

  const loadFile = async (file: File) => {
    reset();
    setFileName(file.name);
    let text = "";
    const found = new Map<string, JSZip.JSZipObject>();

    if (file.name.toLowerCase().endsWith(".zip")) {
      let zip = await JSZip.loadAsync(file);
      const nested = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith(".zip"));
      if (nested && !Object.values(zip.files).some((f) => f.name.toLowerCase().endsWith(".csv"))) {
        zip = await JSZip.loadAsync(await nested.async("blob"));
      }
      const csvs = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".csv"));
      const csv = csvs.find((f) => f.name.toLowerCase().endsWith("_all.csv")) ?? csvs[0];
      if (!csv) return setError("No CSV file inside this zip. Export the Notion database as Markdown & CSV.");
      text = await csv.async("string");
      for (const f of Object.values(zip.files)) {
        if (!f.dir && /\.(png|jpe?g|gif|webp)$/i.test(f.name)) found.set(decode(f.name), f);
      }
    } else {
      text = await file.text();
    }

    const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true });
    const cols = parsed.meta.fields ?? [];
    setHeaders(cols);
    setRawRows(parsed.data);
    setImages(found);
    setMapping(autoMap(cols));
  };

  const imageRefs = (row: Record<string, string>) =>
    mapping.image ? (row[mapping.image] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : [];

  const buildRows = () =>
    rawRows.map((r) => {
      const get = (k: FieldKey) => (mapping[k] ? r[mapping[k]!] : undefined);
      const refs = imageRefs(r);
      return {
        tradeDate: get("tradeDate"),
        side: get("side"),
        outcome: get("outcome"),
        entryPrice: get("entryPrice"),
        exitPrice: get("exitPrice"),
        strategy: get("strategy"),
        notes: get("notes"),
        imageUrl: refs.find((x) => /^https?:\/\//.test(x)) ?? null,
        imageRef: refs.join(", ") || null,
      };
    });

  const missing = FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);

  const send = (commit: boolean) =>
    api("/api/import", { method: "POST", json: { rows: buildRows(), timeZone, dayFirst, commit } });

  const check = async () => {
    setBusy(true);
    reset();
    try {
      setPreview((await send(false)).results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    setError("");
    try {
      setStatus("Saving trades…");
      const res = await send(true);
      setPreview(res.results);
      let uploaded = 0;
      const withImages = res.results
        .filter((r: Result) => r.id)
        .map((r: Result) => ({ id: r.id!, file: imageRefs(rawRows[r.index]).map((ref) => findImage(images, ref)).find(Boolean) }))
        .filter((x: { file?: JSZip.JSZipObject }) => x.file);
      for (const { id, file } of withImages) {
        setStatus(`Uploading screenshots ${uploaded + 1} of ${withImages.length}…`);
        await uploadTradeImage(id, await file!.async("blob"));
        uploaded++;
      }
      setSummary({ inserted: res.inserted, duplicates: res.duplicates, images: uploaded });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatus("");
      setBusy(false);
    }
  };

  return {
    fileName,
    headers,
    rows: rawRows,
    imageCount: images.size,
    mapping,
    setMapping: (key: FieldKey, col: string) => {
      setMapping({ ...mapping, [key]: col || undefined });
      reset();
    },
    timeZone,
    setTimeZone: (tz: string) => {
      setTimeZone(tz);
      reset();
    },
    dayFirst,
    setDayFirst: (v: boolean) => {
      setDayFirst(v);
      reset();
    },
    missing,
    preview,
    summary,
    status,
    busy,
    error,
    loadFile,
    check,
    commit,
  };
}
