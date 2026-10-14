import { rMultiple } from "@/lib/format";
import { rOf, type Outcome } from "@/lib/trading";

const TONE = { win: "bg-win-soft text-win", loss: "bg-loss-soft text-loss", be: "bg-raised text-muted" };

export default function RBadge({ outcome, large = false }: { outcome: Outcome; large?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold ${TONE[outcome]} ${large ? "px-3 py-1.5 text-base" : "min-w-12 px-2 py-1 text-sm"}`}>
      {rMultiple(rOf(outcome))}
    </span>
  );
}
