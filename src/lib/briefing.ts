import { createHash } from "node:crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { query } from "./db";
import { cleanText, recentNews } from "./news";

export const VOICES = [
  "en-AU-NatashaNeural",
  "en-AU-WilliamNeural",
  "en-US-AriaNeural",
  "en-US-GuyNeural",
  "en-GB-SoniaNeural",
];

export type BriefingOptions = {
  items: number;
  minImpact: number;
  summaries: boolean;
  cryptoOnly: boolean;
  voice: string;
  rate: number;
};

export const DEFAULT_OPTIONS: BriefingOptions = {
  items: 8,
  minImpact: 30,
  summaries: true,
  cryptoOnly: false,
  voice: "en-AU-NatashaNeural",
  rate: 0,
};

const SPOKEN: Record<string, string> = {
  coindesk: "CoinDesk",
  cointelegraph: "Cointelegraph",
  decrypt: "Decrypt",
  google_news: "Google News",
  cnbc: "CNBC",
  marketwatch: "MarketWatch",
  investing_com: "Investing.com",
  yahoo: "Yahoo Finance",
  nasdaq: "Nasdaq",
};

const spokenSource = (s: string) =>
  Object.entries(SPOKEN).find(([k]) => s.startsWith(k))?.[1] ??
  s.replace(/_/g, " ");
const norm = (t: string) =>
  cleanText(t, 10000)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 60);

export function parseOptions(params: URLSearchParams): BriefingOptions {
  const num = (k: string, d: number) =>
    params.has(k) && !isNaN(Number(params.get(k))) ? Number(params.get(k)) : d;
  const voice = params.get("voice") ?? DEFAULT_OPTIONS.voice;
  return {
    items: Math.min(Math.max(num("items", DEFAULT_OPTIONS.items), 1), 25),
    minImpact: num("minImpact", DEFAULT_OPTIONS.minImpact),
    summaries: params.get("summaries") !== "false",
    cryptoOnly: params.get("cryptoOnly") === "true",
    voice: VOICES.includes(voice) ? voice : DEFAULT_OPTIONS.voice,
    rate: Math.min(Math.max(num("rate", 0), -30), 50),
  };
}

export async function buildScript(opts: BriefingOptions) {
  const news = await recentNews({
    hours: 24,
    minImpact: opts.minImpact,
    cryptoOnly: opts.cryptoOnly,
  });
  const seen = new Set<string>();
  const picked = news
    .filter((a) => {
      const key = norm(a.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, opts.items);

  if (!picked.length)
    return {
      script: "Trading news briefing. There is no significant news right now.",
      items: [],
    };

  const lines = picked.map((a, i) => {
    const title = cleanText(a.title, 160).replace(/\.$/, "");
    let line = `Item ${i + 1}. ${a.impactLevel} impact, ${a.sentiment.toLowerCase()}. From ${spokenSource(a.source)}. ${title}.`;
    const summary = cleanText(a.summary, 180);
    if (
      opts.summaries &&
      summary &&
      norm(summary).slice(0, 30) !== norm(title).slice(0, 30)
    )
      line += ` ${summary}`;
    return line;
  });

  const n = picked.length;
  return {
    script: [
      `Trading news briefing. ${n} item${n === 1 ? "" : "s"}, most important first.`,
      ...lines,
      "End of briefing.",
    ].join("\n\n"),
    items: picked,
  };
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function synthesize(text: string, voice: string, rate: number) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(escapeXml(text), {
    rate: `${rate >= 0 ? "+" : ""}${rate}%`,
  });
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    audioStream.on("close", resolve);
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  tts.close();
  const audio = Buffer.concat(chunks);
  if (!audio.length)
    throw new Error(
      "The voice service returned no audio. Try again in a minute.",
    );
  return audio;
}

export async function getAudio(opts: BriefingOptions) {
  const { script } = await buildScript(opts);
  return cachedAudio(script, opts.voice, opts.rate);
}

export async function cachedAudio(script: string, voice: string, rate: number) {
  const hash = createHash("sha256")
    .update(`${voice}|${rate}|${script}`)
    .digest("hex")
    .slice(0, 24);

  const [cached] = await query(
    `SELECT audio FROM briefings WHERE hash = $1 AND audio IS NOT NULL`,
    [hash],
  );
  if (cached) return Buffer.from(cached.audio);

  const audio = await synthesize(script, voice, rate);
  await query(
    `DELETE FROM briefings WHERE created_at < now() - interval '2 days'`,
  );
  await query(
    `INSERT INTO briefings (hash, script, audio) VALUES ($1,$2,$3) ON CONFLICT (hash) DO NOTHING`,
    [hash, script, audio],
  );
  return audio;
}

export async function savedOptions(): Promise<BriefingOptions> {
  const [row] = await query(
    `SELECT value FROM settings WHERE key = 'briefing'`,
  );
  return { ...DEFAULT_OPTIONS, ...(row?.value ?? {}) };
}

export async function saveOptions(opts: BriefingOptions) {
  await query(
    `INSERT INTO settings (key, value) VALUES ('briefing', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(opts)],
  );
}
