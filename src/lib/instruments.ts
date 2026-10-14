export type Kind = "crypto" | "stock" | "forex" | "commodity" | "index";

export type Instrument = {
  id: string;
  name: string;
  kind: Kind;
  source: "binance" | "yahoo";
  ticker: string;
  aliases: string[];
  decimals: number;
};

export const DEFAULT_WATCHLIST: Instrument[] = [
  { id: "btc", name: "Bitcoin", kind: "crypto", source: "binance", ticker: "BTCUSDT", aliases: ["bitcoin", "btc"], decimals: 0 },
  { id: "eth", name: "Ethereum", kind: "crypto", source: "binance", ticker: "ETHUSDT", aliases: ["ethereum", "ether", "eth"], decimals: 2 },
  { id: "sol", name: "Solana", kind: "crypto", source: "binance", ticker: "SOLUSDT", aliases: ["solana"], decimals: 2 },
  { id: "spy", name: "S&P 500", kind: "index", source: "yahoo", ticker: "SPY", aliases: ["s&p 500", "s&p", "wall street", "stocks"], decimals: 2 },
  { id: "nvda", name: "Nvidia", kind: "stock", source: "yahoo", ticker: "NVDA", aliases: ["nvidia", "nvda"], decimals: 2 },
  { id: "aapl", name: "Apple", kind: "stock", source: "yahoo", ticker: "AAPL", aliases: ["apple", "aapl", "iphone"], decimals: 2 },
  { id: "tsla", name: "Tesla", kind: "stock", source: "yahoo", ticker: "TSLA", aliases: ["tesla", "tsla", "musk"], decimals: 2 },
  { id: "eurusd", name: "EUR/USD", kind: "forex", source: "yahoo", ticker: "EURUSD=X", aliases: ["euro", "eur/usd", "ecb", "lagarde"], decimals: 4 },
  { id: "gbpusd", name: "GBP/USD", kind: "forex", source: "yahoo", ticker: "GBPUSD=X", aliases: ["sterling", "pound", "gbp/usd", "bank of england"], decimals: 4 },
  { id: "audusd", name: "AUD/USD", kind: "forex", source: "yahoo", ticker: "AUDUSD=X", aliases: ["aussie dollar", "australian dollar", "aud/usd", "rba", "reserve bank of australia"], decimals: 4 },
  { id: "usdjpy", name: "USD/JPY", kind: "forex", source: "yahoo", ticker: "USDJPY=X", aliases: ["yen", "usd/jpy", "bank of japan", "boj"], decimals: 2 },
  { id: "gold", name: "Gold", kind: "commodity", source: "yahoo", ticker: "GC=F", aliases: ["gold", "bullion", "xau"], decimals: 1 },
];

export const KIND_LABEL: Record<Kind, string> = { crypto: "Crypto", stock: "Stocks", index: "Indices", forex: "Forex", commodity: "Commodities" };

export const TIMEFRAMES = [
  { id: "15m", label: "15 min", higher: "1h" },
  { id: "1h", label: "1 hour", higher: "1d" },
  { id: "1d", label: "1 day", higher: "1w" },
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number]["id"];

export type Reason = { text: string; tone: "bull" | "bear" | "neutral" };

export type Signal = {
  id: string;
  name: string;
  kind: Kind;
  decimals: number;
  timeframe: Timeframe;
  price: number;
  change24h: number;
  score: number;
  verdict: "Strong buy" | "Buy" | "Neutral" | "Sell" | "Strong sell";
  reasons: Reason[];
  technicals: {
    rsi: number;
    trend: "up" | "down";
    higherTrend: "up" | "down" | null;
    aboveEma200: boolean | null;
    macdHist: number;
    macdRising: boolean;
    atr: number;
    support: number;
    resistance: number;
  };
  news: { count: number; sentiment: number | null };
  levels: { entry: number; stop: number; target: number } | null;
  spark: number[];
  computedAt: string;
  error?: string;
};

export function slugify(ticker: string) {
  return ticker.toLowerCase().replace(/[^a-z0-9]/g, "");
}
