import type { Article } from "@/hooks/useNews";
import { timeAgo } from "@/lib/format";

const LEVEL = {
  High: "bg-loss-soft text-loss",
  Medium: "bg-news-soft text-news",
  Low: "bg-raised text-muted",
};
const SENTIMENT = { Positive: "text-win", Negative: "text-loss", Neutral: "text-muted" };

export default function NewsList({ articles, compact = false }: { articles: Article[]; compact?: boolean }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {articles.map((a) => (
        <li key={a.id}>
          <a href={a.link} target="_blank" rel="noreferrer" className="flex gap-3 p-4 hover:bg-raised">
            <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-bold ${LEVEL[a.impactLevel]}`} title={`${a.impactLevel} impact`}>
              {Math.round(a.impactScore)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{a.title}</p>
              {!compact && a.summary && a.summary !== a.title && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.summary}</p>}
              <p className="mt-1.5 text-xs text-muted">
                {a.impactLevel} impact <span className="px-1">•</span>
                <span className={SENTIMENT[a.sentiment]}>{a.sentiment}</span> <span className="px-1">•</span>
                {a.source.replace(/_/g, " ")}, {timeAgo(a.publishedAt)}
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
