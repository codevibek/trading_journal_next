export const RISK_USD = 200;
export const REWARD_R = 2;
export const BREAKEVEN_WIN_RATE = 1 / (1 + REWARD_R);

export type Side = "long" | "short";
export type Outcome = "win" | "loss" | "be";

export type Trade = {
  id: number;
  strategy: string;
  side: Side;
  outcome: Outcome;
  entryTime: string;
  entryPrice: number;
  exitPrice: number | null;
  notes: string | null;
  hasImage: boolean;
  imageUrl: string | null;
  imageRef: string | null;
  features: Features | null;
  newsContext: NewsContext | null;
};

export type NewsContext = {
  checkedAt: string;
  sources: string[];
  count: number;
  highCount: number;
  sentiment: number | null;
  macro: { name: string; impact: string; minutes: number } | null;
  macroChecked: boolean;
};
export type Features = {
  entryInRange: boolean;
  session: string;
  weekday: string;
  rsi15: number;
  trend15: "up" | "down";
  trend1h: "up" | "down";
  trend4h: "up" | "down";
  atrPct: number;
  volumeRatio: number;
  signalCandle: "green" | "red";
  newsHighBefore: number | null;
  newsSentimentBefore: number | null;
};

export const hasFeatures = (t: Trade) => !!t.features && "rsi15" in t.features;

export const rOf = (outcome: Outcome) => (outcome === "win" ? REWARD_R : outcome === "loss" ? -1 : 0);

export function normSide(v: unknown): Side | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(long|buy|l|bull)/.test(s)) return "long";
  if (/^(short|sell|s|bear)/.test(s)) return "short";
  return null;
}

export function normOutcome(v: unknown): Outcome | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(profit|win|won|tp|w|gain)/.test(s)) return "win";
  if (/^(loss|lose|lost|sl|l|stop)/.test(s)) return "loss";
  if (/^(be|break|scratch|flat)/.test(s)) return "be";
  const n = Number(s.replace(/[$,]/g, ""));
  if (s && !isNaN(n)) return n > 0 ? "win" : n < 0 ? "loss" : "be";
  return null;
}

export function normPrice(v: unknown) {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return String(v ?? "").trim() && !isNaN(n) ? n : null;
}
