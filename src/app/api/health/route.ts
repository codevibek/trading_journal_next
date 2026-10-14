import { isConfigured, query } from "@/lib/db";

export async function GET() {
  if (!isConfigured()) return Response.json({ ok: false, configured: false });
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, configured: true });
  } catch (err) {
    return Response.json({ ok: false, configured: true, error: (err as Error).message });
  }
}
