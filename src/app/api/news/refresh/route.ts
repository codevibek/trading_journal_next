import { lastFetchedAt, refreshNews } from "@/lib/news";

export const maxDuration = 60;

export async function POST() {
  const result = await refreshNews();
  return Response.json({ ...result, lastFetchedAt: await lastFetchedAt() });
}
