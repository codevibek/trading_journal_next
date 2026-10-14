"use client";

import { useRouter } from "next/navigation";
import TradeForm from "@/components/TradeForm";
import { PageHeader } from "@/components/ui";
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
      <PageHeader title="Log a trade" subtitle="Market context is added automatically from BTC price history." />
      <TradeForm draft={t.draft} update={t.update} strategies={strategies} image={t.image} setImage={t.setImage} imageSrc={null} />
      {t.error && <p className="text-sm text-loss">{t.error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={t.saving} className="btn-primary flex-1 py-3 sm:flex-none sm:px-8">
          {t.saving ? "Saving…" : "Save trade"}
        </button>
        <button onClick={() => router.back()} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
