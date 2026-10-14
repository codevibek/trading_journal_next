import { marketSummary } from "@/lib/signals";

export async function GET() {
  return Response.json(await marketSummary());
}
