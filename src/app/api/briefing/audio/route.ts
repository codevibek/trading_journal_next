import { getAudio, parseOptions } from "@/lib/briefing";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const audio = await getAudio(parseOptions(new URL(request.url).searchParams));
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return Response.json({ error: `Couldn't record the briefing: ${(err as Error).message}` }, { status: 502 });
  }
}
