import type { Timeframe } from "@/lib/instruments";
import { getDetail } from "@/lib/signals";

export async function GET(request: Request, ctx: RouteContext<"/api/signals/[id]">) {
  const params = new URL(request.url).searchParams;
  const tf = (["15m", "1h", "1d"].includes(params.get("tf") ?? "") ? params.get("tf") : "1h") as Timeframe;
  try {
    const detail = await getDetail((await ctx.params).id, tf);
    if (!detail) return Response.json({ error: "That instrument isn't on your watchlist." }, { status: 404 });
    return Response.json(detail);
  } catch (err) {
    return Response.json({ error: `Couldn't load prices: ${(err as Error).message}` }, { status: 502 });
  }
}
