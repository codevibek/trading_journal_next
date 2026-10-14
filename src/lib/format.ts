export function timeAgo(date: string | Date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const price = (n?: number | null) =>
  n == null ? "–" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export const rMultiple = (r: number) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(r % 1 ? 2 : 0)}R`;

export function dateTime(date: string | Date) {
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
