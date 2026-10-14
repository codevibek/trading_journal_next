import { rMultiple } from "@/lib/format";
import { rOf, type Outcome } from "@/lib/trading";

const TONE = { win: "bg-win-soft text-win", loss: "bg-loss-soft text-loss", be: "bg-raised text-muted" };

export default function RBadge({ outcome }: { outcome: Outcome }) {
  return <span className={`inline-block min-w-12 rounded-md px-2 py-1 text-center text-sm font-semibold ${TONE[outcome]}`}>{rMultiple(rOf(outcome))}</span>;
}
