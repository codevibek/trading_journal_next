import { buildExchangeScript, exchangeAudio, MARKETS, type Market } from "@/lib/exchange";

export const maxDuration = 60;

export async function GET(request: Request, ctx: RouteContext<"/api/exchange/[market]/audio">) {
  const { market } = await ctx.params;
  if (!MARKETS.includes(market as Market)) return Response.json({ error: "Unknown market" }, { status: 404 });
  if (new URL(request.url).searchParams.get("script") === "true") return Response.json({ script: await buildExchangeScript(market as Market) });
  try {
    const audio = await exchangeAudio(market as Market);
    return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audio.length) } });
  } catch (err) {
    return Response.json({ error: `Couldn't record the briefing: ${(err as Error).message}` }, { status: 502 });
  }
}
