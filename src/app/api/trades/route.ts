import { insertTrade, listTrades, validate } from "@/lib/trades";

export async function GET() {
  return Response.json({ trades: await listTrades() });
}

export async function POST(request: Request) {
  const { errors, value } = validate(await request.json());
  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });
  const id = await insertTrade(value);
  if (!id) return Response.json({ error: "A trade with this time, strategy and entry price already exists." }, { status: 409 });
  return Response.json({ id });
}
