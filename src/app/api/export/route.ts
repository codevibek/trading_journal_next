import Papa from "papaparse";
import { listTrades } from "@/lib/trades";
import { rOf, RISK_USD } from "@/lib/trading";

export async function GET() {
  const rows = (await listTrades()).map(({ features, ...t }) => ({
    id: t.id,
    strategy: t.strategy,
    side: t.side,
    outcome: t.outcome,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    notes: t.notes,
    entryTime: new Date(t.entryTime).toISOString(),
    r: rOf(t.outcome),
    pnlUsd: rOf(t.outcome) * RISK_USD,
    win: t.outcome === "win" ? 1 : 0,
    ...(features && "rsi15" in features ? features : {}),
  }));
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return new Response(Papa.unparse(rows, { columns }), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="trades-with-context-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
