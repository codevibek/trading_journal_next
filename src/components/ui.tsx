import Icon, { type IconName } from "./Icon";

export const TONES = {
  brand: "bg-brand-soft text-brand",
  win: "bg-win-soft text-win",
  loss: "bg-loss-soft text-loss",
  news: "bg-news-soft text-news",
  violet: "bg-violet-soft text-violet",
  sky: "bg-sky-soft text-sky",
  muted: "bg-raised text-muted",
};

export type Tone = keyof typeof TONES;

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, tone, label, value, sub }: { icon: IconName; tone: Tone; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted">{label}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "bg-text text-bg" : "bg-panel text-muted ring-1 ring-line hover:text-text"}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-raised text-muted">
        <Icon name={icon} />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "news", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div className={`flex gap-2.5 rounded-xl p-3 text-sm ${TONES[tone]}`}>
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
