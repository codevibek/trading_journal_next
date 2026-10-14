# Trade Desk

Morning news briefing, BTC trade journal, and win-rate insights in one Next.js app. Add it to your phone's home screen and it behaves like an app.

## Run it locally

1. Create a free Postgres database at [neon.tech](https://neon.tech). On the project dashboard choose **Connect** and copy the `postgresql://…` string.
2. Create `.env.local` in this folder containing `DATABASE_URL=<that string>`.
3. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Tables are created automatically. If the database isn't set up, the app shows these steps instead of an error. Using the same database locally and when deployed means your phone and laptop see the same journal.

## Screens

- **Home**: the morning briefing player, win rate, total result, this month, an equity curve, recent trades and top headlines.
- **Signals**: a plain-English summary of today's news (mood, main themes, most-mentioned instruments), then Buy, Sell or Neutral calls for your watchlist of crypto, stocks, forex and gold. Each call combines the 20/50 EMA trend, the higher-timeframe trend, the 200 EMA, MACD, RSI and the sentiment of related headlines into a score from −100 to +100. The reasons are listed so you can see why. Tap an instrument for a candle chart with EMAs, support and resistance, a 1:2 trade plan (stop at 1.5× ATR) and related news. Crypto prices come from Binance; stocks, forex and commodities from Yahoo Finance's free chart data. Edit the watchlist from the page. Results are cached for 15 minutes.
- **News**: fetches crypto and market RSS feeds, scores each headline for impact and sentiment, and reads the top stories aloud. Every headline is saved with its timestamp, which builds the news history the Insights screen uses.
- **Journal**: log trades with direction, result, entry and exit prices, notes and a chart screenshot. Each trade shows the market at entry and the news from the 3 hours before.
- **Import**: upload the Notion export (.zip with screenshots, or just the .csv). You match columns, pick the timezone the dates were logged in, check the rows, then import. Re-importing the same file skips trades that are already in the journal.
- **Insights**: pulls BTCUSDT 15m, 1h and 4h candles from Binance for every trade. Indicators come only from candles that closed before entry. Win rates are grouped by session, trend, RSI, volatility, volume, signal candle, news and day, and each one is compared with the 33.3% breakeven for 1:2 risk to reward. **Download data for Python** exports everything as a CSV for notebooks or ML.

## Code layout

```
src/
  app/            pages and API routes (app/api/*)
  hooks/          one hook per feature: useNews, useBriefing, useTrades, useTrade, useCsvImport, useInsights, useSetup
  components/     Nav, BriefingCard, TradeForm, TradeList, NewsList, ui (cards, pills), charts/
  lib/            db, news + impact scoring, briefing + TTS, trades, dates, candles/indicators/features
```

Risk settings live in `src/lib/trading.ts`: `RISK_USD = 200` and `REWARD_R = 2`.

## Deploy (Vercel + Neon, both have free tiers)

1. Push this folder to a GitHub repo.
2. Use the same Neon connection string (or create a separate database for production).
3. On vercel.com, import the repo and add these environment variables:
   - `DATABASE_URL`: the Neon connection string
   - `APP_PASSWORD`: the password you'll sign in with
   - `CRON_SECRET`: any long random string
4. Deploy, open the site on your phone, then use Share and Add to Home Screen.

Tables are created automatically on first use. `vercel.json` schedules `/api/cron/morning` at 19:00 UTC, which is 6am in Sydney during daylight saving and 5am otherwise. That run fetches news and records the briefing using your saved settings, so it plays instantly in the morning.

## Notes

- **Yahoo Finance**: an unofficial free endpoint with no key. It occasionally rate-limits; set `YAHOO_BASE_URL` if you switch to a compatible source.
- **Binance region**: price data comes from `data-api.binance.vision`, Binance's public market-data host. If it's ever blocked where the app runs, set `BINANCE_BASE_URL` to another Binance-compatible klines API.
- **Voice**: the briefing uses Microsoft Edge's free read-aloud voices through `msedge-tts`. It's unofficial and can occasionally break; updating the package usually fixes it.
- **Timezone check**: if Insights says many entries fall outside their 15m candle, the import timezone is wrong. Delete the trades and re-import with the right one.
- **News for older trades**: headlines are only saved once the app is running, so news context fills in for trades from that point on.
- **More feeds**: add RSS feeds without code changes with `EXTRA_FEEDS=name=url,name=url`.
# trading_journal_next
