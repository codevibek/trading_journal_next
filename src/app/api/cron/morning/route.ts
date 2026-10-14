import { getAudio, savedOptions } from "@/lib/briefing";
import { refreshNews } from "@/lib/news";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const news = await refreshNews();
  let audio = "ready";
  try {
    await getAudio(await savedOptions());
  } catch (err) {
    audio = (err as Error).message;
  }
  return Response.json({ ...news, audio });
}
