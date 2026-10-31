"use client";

import Icon from "@/components/Icon";
import NewsList from "@/components/NewsList";
import { Empty, PageHeader, Pill } from "@/components/ui";
import { useNews } from "@/hooks/useNews";
import { timeAgo } from "@/lib/format";
import Link from "next/link";

export default function NewsPage() {
  const news = useNews();
  const f = news.filters;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="News"
        subtitle={
          news.lastFetchedAt
            ? `Last 24 hours, updated ${timeAgo(news.lastFetchedAt)}`
            : "Last 24 hours"
        }
        action={
          <button
            onClick={news.refresh}
            disabled={news.refreshing}
            className="btn-ghost"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${news.refreshing ? "animate-spin" : ""}`}
            />
            {news.refreshing ? "Fetching…" : "Fetch latest"}
          </button>
        }
      />
      <div className="flex gap-2 lg:hidden">
        <Link href="/asx" className="btn-ghost flex-1">
          ASX company news
        </Link>
        <Link href="/us" className="btn-ghost flex-1">
          US company news
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        <label className="relative">
          <Icon
            name="search"
            className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            value={f.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder="Search headlines"
            className="field pl-10"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Pill active={f.level === "All"} onClick={() => f.setLevel("All")}>
            All
          </Pill>
          <Pill
            active={f.level === "Medium"}
            onClick={() => f.setLevel("Medium")}
          >
            Medium and high
          </Pill>
          <Pill active={f.level === "High"} onClick={() => f.setLevel("High")}>
            High only
          </Pill>
          <Pill
            active={f.cryptoOnly}
            onClick={() => f.setCryptoOnly(!f.cryptoOnly)}
          >
            Crypto only
          </Pill>
        </div>
      </div>

      {news.error && <p className="text-sm text-loss">{news.error}</p>}
      {news.failedFeeds.length > 0 && (
        <p className="text-xs text-muted">
          Couldn&apos;t reach: {news.failedFeeds.join(", ")}
        </p>
      )}

      {news.articles.length > 0 ? (
        <NewsList articles={news.articles} />
      ) : (
        !news.loading && (
          <Empty
            icon="news"
            title={
              news.total
                ? "Nothing matches these filters"
                : "No headlines saved yet"
            }
          >
            {news.total
              ? "Try a broader filter."
              : "Use Fetch latest to pull headlines from the news feeds."}
          </Empty>
        )
      )}
      <p className="text-xs text-muted">
        The impact score is a rough guide from headline wording and sentiment.
        It doesn&apos;t predict price.
      </p>
    </div>
  );
}
