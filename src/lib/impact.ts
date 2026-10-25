import vader from "vader-sentiment";

const KEYWORDS: Record<string, number> = {
  bankruptcy: 10, "files for chapter 11": 10, default: 9, fraud: 9, "sec investigation": 9,
  halted: 8, "trading halt": 8, delisted: 9, collapse: 8,
  "earnings miss": 8, "misses estimates": 8, "beats estimates": 7, "guidance cut": 8,
  "profit warning": 8, "cuts guidance": 8, "raises guidance": 7, "record profit": 6, "record loss": 8,
  recall: 7, acquires: 6, buyback: 5, ipo: 6, spinoff: 5, "bankruptcy protection": 10, "ceo steps down": 7,
  restructuring: 5, "price target cut": 6, "price target raised": 5, acquisition: 7, merger: 7, layoffs: 6, "ceo resigns": 7,
  downgrade: 6, upgrade: 5,
  "rate hike": 8, "rate cut": 8, "interest rates": 5, fed: 5, "federal reserve": 5, fomc: 7,
  powell: 6, inflation: 5, recession: 8, stimulus: 6, tariff: 7, sanctions: 7, shutdown: 6,
  cpi: 6, ppi: 5, "jobs report": 6, payrolls: 6, unemployment: 5,
  plunge: 8, plunges: 8, soar: 7, soars: 7, crash: 9, crashes: 9, surge: 6, surges: 6,
  rally: 5, tumbles: 7, "record high": 6, "all-time high": 7, "record low": 7, selloff: 7, "sell-off": 7,
  lawsuit: 6, antitrust: 7, "regulatory approval": 6, ban: 7,
  etf: 6, "etf inflows": 7, "etf outflows": 7, sec: 5, halving: 7, liquidation: 7, liquidations: 7,
  hack: 8, hacked: 8, exploit: 8, stablecoin: 5, tether: 5, "strategic reserve": 7, whale: 4,
  "short squeeze": 7, microstrategy: 5, blackrock: 5, "mt. gox": 7,
};

const CRYPTO_RE = /\b(bitcoin|btc|crypto|cryptocurrency|ethereum|stablecoin|blockchain|coinbase|binance|etf)\b/i;

const MARKET_TONE: [RegExp, number][] = [
  [/\b(rall(y|ies|ied)|surg(e|es|ed|ing)|soar(s|ed|ing)?|jump(s|ed)?|climb(s|ed)?|gain(s|ed)?|rebound(s|ed)?|recover(s|ed|y)?|bull(ish)?|breakout|all-time high|record high|inflows?|beats? estimates|upgrade[sd]?|approv(al|ed|es)|adoption|cools?|eases?)\b/g, 0.35],
  [/\b(plung(e|es|ed|ing)|slid(e|es|ing)|slump(s|ed)?|tumbl(e|es|ed)|drop(s|ped)?|fall(s|ing)?|fell|crash(es|ed)?|sell-?off|outflows?|hack(s|ed)?|exploit(s|ed)?|liquidat(ion|ions|ed)|bear(ish)?|downgrade[sd]?|lawsuit|ban(s|ned)?|fraud|miss(es|ed)? estimates|record low|fears?|recession|default)\b/g, -0.35],
];

function marketTone(text: string) {
  let tone = 0;
  for (const [re, weight] of MARKET_TONE) tone += (text.match(re)?.length ?? 0) * weight;
  return Math.max(-1, Math.min(1, tone));
}
export function scoreImpact(title: string, summary: string) {
  const text = `${title}. ${summary}`.trim();
  const vaderScore: number = vader.SentimentIntensityAnalyzer.polarity_scores(text).compound;
  const compound = Math.max(-1, Math.min(1, vaderScore + marketTone(text.toLowerCase())));  const sentiment = compound >= 0.15 ? "Positive" : compound <= -0.15 ? "Negative" : "Neutral";

  const lower = text.toLowerCase();
  const weights = Object.entries(KEYWORDS)
    .filter(([kw]) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower))
    .map(([, w]) => w);

  let keywordPoints = 0;
  if (weights.length) {
    const bonus = Math.min((weights.length - 1) * 3, 10);
    keywordPoints = Math.min((Math.max(...weights) / 10) * 50 + bonus, 50);
  }

  const score = Math.round(Math.min(Math.abs(compound) * 50 + keywordPoints, 100) * 10) / 10;
  const level = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";

  return { score, level, sentiment, compound: Math.round(compound * 1000) / 1000, isCrypto: CRYPTO_RE.test(text) };
}
