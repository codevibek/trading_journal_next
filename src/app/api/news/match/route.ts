import { matchBatch, matchStatus } from "@/lib/history";

export const maxDuration = 60;

export async function GET() {
  return Response.json(await matchStatus());
}

export async function POST(request: Request) {
  const reset = new URL(request.url).searchParams.get("reset") === "true";
  return Response.json(await matchBatch({ reset }));
}
