import { Pool } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS news_articles (
  id SERIAL PRIMARY KEY,
  link TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sentiment TEXT,
  sentiment_score DOUBLE PRECISION,
  impact_score DOUBLE PRECISION,
  impact_level TEXT,
  is_crypto BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS news_published_idx ON news_articles (published_at);

CREATE TABLE IF NOT EXISTS briefings (
  hash TEXT PRIMARY KEY,
  script TEXT NOT NULL,
  audio BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  strategy TEXT NOT NULL DEFAULT 'Default',
  side TEXT NOT NULL,
  outcome TEXT NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  entry_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION,
  notes TEXT,
  image BYTEA,
  image_type TEXT,
  image_url TEXT,
  image_ref TEXT,
  features JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_time, strategy, entry_price)
);
`;

type Runner = (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;

const g = globalThis as unknown as { __db?: Promise<Runner> };

export const isConfigured = () => !!process.env.DATABASE_URL;

async function connect(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (see the setup screen).");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: local || /sslmode=/.test(url) ? undefined : { rejectUnauthorized: false },
    max: 3,
  });
  const run: Runner = (text, params) => pool.query(text, params as any[]);
  await run(SCHEMA);
  return run;
}

export async function query(text: string, params: unknown[] = []) {
  g.__db ??= connect().catch((err) => {
    g.__db = undefined;
    throw err;
  });
  const run = await g.__db;
  return (await run(text, params)).rows;
}
