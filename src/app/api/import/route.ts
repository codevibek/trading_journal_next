import { parseTradeDate } from "@/lib/dates";
import { insertTrade, validate } from "@/lib/trades";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { rows, timeZone, dayFirst, commit } = await request.json();
  const results = [];

  for (const [i, row] of (rows as any[]).entries()) {
    const parsed = parseTradeDate(row.tradeDate, timeZone, dayFirst);
    const { errors, value } = validate({ ...row, entryTime: parsed.date });
    if (parsed.error) errors.unshift(parsed.error);
    const warnings = parsed.date && !parsed.hasTime ? ["No time in the date, so it will be treated as midnight."] : [];

    const ok = !errors.length;
    let id: number | undefined;
    let duplicate = false;
    if (ok && commit) {
      id = await insertTrade(value);
      duplicate = !id;
    }
    results.push({ index: i, ok, errors, warnings, id, duplicate, entryTime: parsed.date ?? null });
  }

  return Response.json({
    results,
    valid: results.filter((r) => r.ok).length,
    inserted: results.filter((r) => r.id).length,
    duplicates: results.filter((r) => r.duplicate).length,
  });
}
