"use client";

import { useRouter } from "next/navigation";
import TradeForm from "@/components/TradeForm";
import { useTrade } from "@/hooks/useTrade";
import { useTrades } from "@/hooks/useTrades";

export default function NewTradePage() {
  const router = useRouter();
  const t = useTrade();
  const { strategies } = useTrades();

  const save = async () => {
    const id = await t.save();
    if (id) router.push(`/journal/${id}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Log a trade</h1>
      <div className="rounded-2xl border border-line bg-panel p-5">
        <TradeForm draft={t.draft} update={t.update} strategies={strategies} image={t.image} setImage={t.setImage} imageSrc={null} />
      </div>
      {t.error && <p className="text-sm text-loss">{t.error}</p>}
      <button onClick={save} disabled={t.saving} className="rounded-xl bg-amber py-3 font-medium text-bg disabled:opacity-60">
        {t.saving ? "Saving…" : "Save trade"}
      </button>
    </div>
  );
}
