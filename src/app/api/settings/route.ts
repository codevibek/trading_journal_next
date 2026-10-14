import { parseOptions, saveOptions, savedOptions } from "@/lib/briefing";

export async function GET() {
  return Response.json(await savedOptions());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const opts = parseOptions(new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])));
  await saveOptions(opts);
  return Response.json(opts);
}
