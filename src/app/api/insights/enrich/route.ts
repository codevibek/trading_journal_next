import { query } from "@/lib/db";
import { enrichPending } from "@/lib/features";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.get("reset") === "true") await query(`UPDATE trades SET features = NULL`);
  return Response.json(await enrichPending());
}
