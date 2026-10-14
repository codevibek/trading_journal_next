import { buildScript, parseOptions } from "@/lib/briefing";

export async function GET(request: Request) {
  const { script, items } = await buildScript(parseOptions(new URL(request.url).searchParams));
  return Response.json({ script, count: items.length });
}
