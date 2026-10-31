import { listCompanyNews, MARKETS, refreshCompanyNews, type Market } from "@/lib/exchange";

export const maxDuration = 60;

export async function GET(request: Request, ctx: RouteContext<"/api/exchange/[market]">) {
  const { market } = await ctx.params;
  if (!MARKETS.includes(market as Market)) return Response.json({ error: "Unknown market" }, { status: 404 });
  return Response.json(await listCompanyNews(market as Market, new URL(request.url).searchParams.get("all") === "true"));
}

export async function POST(_: Request, ctx: RouteContext<"/api/exchange/[market]">) {
  const { market } = await ctx.params;
  if (!MARKETS.includes(market as Market)) return Response.json({ error: "Unknown market" }, { status: 404 });
  try {
    return Response.json(await refreshCompanyNews(market as Market));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
