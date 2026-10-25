import { query } from "./db";
import { normOutcome, normPrice, normSide, type Trade } from "./trading";

const COLUMNS = `id, strategy, side, outcome, entry_time AS "entryTime", entry_price AS "entryPrice",
  exit_price AS "exitPrice", notes, image IS NOT NULL AS "hasImage", image_url AS "imageUrl",
  image_ref AS "imageRef", features, news_context AS "newsContext"`;

export async function listTrades(): Promise<Trade[]> {
  return query(`SELECT ${COLUMNS} FROM trades ORDER BY entry_time DESC`);
}

export async function getTrade(id: number): Promise<Trade | undefined> {
  const [row] = await query(`SELECT ${COLUMNS} FROM trades WHERE id = $1`, [
    id,
  ]);
  return row;
}
export async function deleteAllTrades() {
  const rows = await query(`DELETE FROM trades RETURNING id`);
  return rows.length;
}
export function validate(input: any) {
  const side = normSide(input.side);
  const outcome = normOutcome(input.outcome);
  const entryPrice = normPrice(input.entryPrice);
  const entryTime = new Date(input.entryTime);
  const errors = [
    !side && "Trade type must be long or short.",
    !outcome && "Result must be profit, loss or breakeven.",
    entryPrice == null && "Entry price is missing.",
    isNaN(entryTime.getTime()) && "Trade date is missing or unreadable.",
  ].filter(Boolean) as string[];

  return {
    errors,
    value: {
      strategy: String(input.strategy ?? "").trim() || "Default",
      side,
      outcome,
      entryTime,
      entryPrice,
      exitPrice: normPrice(input.exitPrice),
      notes: input.notes ? String(input.notes) : null,
      imageUrl: input.imageUrl || null,
      imageRef: input.imageRef || null,
    },
  };
}

type TradeInput = ReturnType<typeof validate>["value"];

export async function insertTrade(t: TradeInput) {
  const [row] = await query(
    `INSERT INTO trades (strategy, side, outcome, entry_time, entry_price, exit_price, notes, image_url, image_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (entry_time, strategy, entry_price) DO NOTHING RETURNING id`,
    [
      t.strategy,
      t.side,
      t.outcome,
      t.entryTime,
      t.entryPrice,
      t.exitPrice,
      t.notes,
      t.imageUrl,
      t.imageRef,
    ],
  );
  return row?.id as number | undefined;
}

export async function updateTrade(id: number, t: TradeInput) {
  await query(
    `UPDATE trades SET strategy=$2, side=$3, outcome=$4, entry_time=$5, entry_price=$6, exit_price=$7, notes=$8,
       features = CASE WHEN entry_time = $5 THEN features ELSE NULL END
     WHERE id = $1,
       news_context = CASE WHEN entry_time = $5 THEN news_context ELSE NULL END`,
    [
      id,
      t.strategy,
      t.side,
      t.outcome,
      t.entryTime,
      t.entryPrice,
      t.exitPrice,
      t.notes,
    ],
  );
}

export async function deleteTrade(id: number) {
  await query(`DELETE FROM trades WHERE id = $1`, [id]);
}

export async function newsBefore(entryTime: string | Date, hours = 3) {
  return query(
    `SELECT id, source, title, link, published_at AS "publishedAt", sentiment,
            impact_score AS "impactScore", impact_level AS "impactLevel"
     FROM news_articles
     WHERE published_at BETWEEN $1::timestamptz - make_interval(hours => $2::int) AND $1::timestamptz
     ORDER BY impact_score DESC, published_at DESC LIMIT 10`,
    [entryTime, hours],
  );
}
