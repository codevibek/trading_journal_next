import { format, isValid, parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const WORDY = ["MMMM d, yyyy h:mm a", "MMMM d, yyyy H:mm", "MMM d, yyyy h:mm a", "MMM d, yyyy H:mm", "MMMM d, yyyy", "MMM d, yyyy"];
const ISO = ["yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy/MM/dd HH:mm", "yyyy-MM-dd"];
const slash = (dayFirst: boolean) => {
  const d = dayFirst ? "d/M/yyyy" : "M/d/yyyy";
  return [`${d} h:mm a`, `${d} H:mm`, `${d} H:mm:ss`, d];
};

export function parseTradeDate(raw: string, timeZone: string, dayFirst = true) {
  let text = String(raw ?? "").split("→")[0].trim();
  if (!text) return { error: "No date" };

  let zone = timeZone;
  const offset = text.match(/\((?:GMT|UTC)([+-]\d{1,2})(?::?(\d{2}))?\)/i);
  if (offset) {
    const h = Number(offset[1]);
    zone = `${h < 0 ? "-" : "+"}${String(Math.abs(h)).padStart(2, "0")}:${offset[2] ?? "00"}`;
  } else if (/\((GMT|UTC)\)/i.test(text)) {
    zone = "UTC";
  }
  text = text.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(text) && !isNaN(Date.parse(text))) {
    return { date: new Date(text), hasTime: true };
  }

  for (const f of [...WORDY, ...ISO, ...slash(dayFirst)]) {
    const d = parse(text, f, new Date(2000, 0, 1));
    if (isValid(d)) {
      const local = format(d, "yyyy-MM-dd'T'HH:mm:ss");
      return { date: fromZonedTime(local, zone), hasTime: /[Hh]/.test(f) };
    }
  }
  return { error: `Couldn't read "${raw}"` };
}
