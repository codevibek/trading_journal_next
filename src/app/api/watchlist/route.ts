import { DEFAULT_WATCHLIST, slugify, type Instrument } from "@/lib/instruments";
import { getWatchlist, saveWatchlist } from "@/lib/signals";

export async function GET() {
  return Response.json({ watchlist: await getWatchlist(), defaults: DEFAULT_WATCHLIST });
}

export async function PUT(request: Request) {
  const { watchlist } = await request.json();
  const clean: Instrument[] = (watchlist as any[])
    .filter((i) => i.ticker && i.name)
    .map((i) => ({
      id: i.id || slugify(i.ticker),
      name: String(i.name).slice(0, 40),
      kind: i.kind,
      source: i.source === "binance" ? "binance" : "yahoo",
      ticker: String(i.ticker).trim().toUpperCase(),
      aliases: (i.aliases?.length ? i.aliases : [i.name, i.ticker]).map((a: string) => String(a).toLowerCase()),
      decimals: Number.isFinite(i.decimals) ? i.decimals : 2,
    }));
  await saveWatchlist(clean);
  return Response.json({ watchlist: clean });
}
