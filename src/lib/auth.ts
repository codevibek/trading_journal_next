import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tj_session";

export function sessionToken() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("trading-journal-session").digest("hex");
}

export function isValidSession(value?: string) {
  const expected = sessionToken();
  if (!expected) return true;
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function checkPassword(input: string) {
  const password = process.env.APP_PASSWORD ?? "";
  const a = createHmac("sha256", "cmp").update(input).digest();
  const b = createHmac("sha256", "cmp").update(password).digest();
  return timingSafeEqual(a, b);
}
