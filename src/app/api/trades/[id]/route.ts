import { deleteTrade, getTrade, newsBefore, updateTrade, validate } from "@/lib/trades";

export async function GET(_req: Request, ctx: RouteContext<"/api/trades/[id]">) {
  const trade = await getTrade(Number((await ctx.params).id));
  if (!trade) return Response.json({ error: "Trade not found." }, { status: 404 });
  return Response.json({ trade, news: await newsBefore(trade.entryTime) });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/trades/[id]">) {
  const { errors, value } = validate(await request.json());
  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });
  await updateTrade(Number((await ctx.params).id), value);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/trades/[id]">) {
  await deleteTrade(Number((await ctx.params).id));
  return Response.json({ ok: true });
}
