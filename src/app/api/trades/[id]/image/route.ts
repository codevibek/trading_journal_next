import { query } from "@/lib/db";

const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(_req: Request, ctx: RouteContext<"/api/trades/[id]/image">) {
  const [row] = await query(`SELECT image, image_type FROM trades WHERE id = $1 AND image IS NOT NULL`, [Number((await ctx.params).id)]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: { "Content-Type": row.image_type || "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/trades/[id]/image">) {
  const file = (await request.formData()).get("image");
  if (!(file instanceof File)) return Response.json({ error: "Attach an image." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image is larger than 4 MB." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  await query(`UPDATE trades SET image = $2, image_type = $3 WHERE id = $1`, [Number((await ctx.params).id), bytes, file.type || "image/jpeg"]);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/trades/[id]/image">) {
  await query(`UPDATE trades SET image = NULL, image_type = NULL, image_url = NULL WHERE id = $1`, [Number((await ctx.params).id)]);
  return Response.json({ ok: true });
}
