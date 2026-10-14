import { lastFetchedAt, recentNews } from "@/lib/news";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const articles = await recentNews({
    hours: Number(params.get("hours") ?? 24),
    minImpact: Number(params.get("minImpact") ?? 0),
    cryptoOnly: params.get("cryptoOnly") === "true",
  });
  return Response.json({ articles, lastFetchedAt: await lastFetchedAt() });
}
