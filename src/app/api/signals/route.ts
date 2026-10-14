import type { Timeframe } from "@/lib/instruments";
import { getSignals } from "@/lib/signals";

export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tf = (["15m", "1h", "1d"].includes(params.get("tf") ?? "") ? params.get("tf") : "1h") as Timeframe;
  return Response.json({ signals: await getSignals(tf, params.get("refresh") === "true") });
}
