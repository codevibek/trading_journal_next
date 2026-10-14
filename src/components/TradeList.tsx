import Link from "next/link";
import { dateTime, price } from "@/lib/format";
import type { Trade } from "@/lib/trading";
import Icon from "./Icon";
import RBadge from "./RBadge";

export default function TradeList({ trades }: { trades: Trade[] }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {trades.map((t) => (
        <li key={t.id}>
          <Link href={`/journal/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-raised">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.side === "long" ? "bg-win-soft text-win" : "bg-loss-soft text-loss"}`} title={t.side}>
              <Icon name={t.side === "long" ? "arrowUp" : "arrowDown"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {t.side === "long" ? "Long" : "Short"} · {t.strategy}
              </p>
              <p className="truncate text-sm text-muted">
                {dateTime(t.entryTime)} · {price(t.entryPrice)} → {price(t.exitPrice)}
              </p>
            </div>
            {(t.hasImage || t.imageUrl) && <Icon name="image" className="h-4 w-4 shrink-0 text-muted" />}
            <RBadge outcome={t.outcome} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
