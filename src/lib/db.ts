import { neon } from "@neondatabase/serverless";

// Lazy: calling neon() at module scope would throw during `next build`
// (before the Neon integration has provisioned DATABASE_URL).
// Plain function, deliberately not a Proxy.
let _sql: ReturnType<typeof neon> | null = null;

/**
 * The Neon marketplace integration does not always inject `DATABASE_URL` — the
 * exact variable it provisions has varied. Accept the usual aliases so a
 * correctly provisioned project can never present as "no database connected".
 */
function connectionString() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

export function getSql() {
  if (!_sql) {
    const url = connectionString();
    if (!url) throw new Error("No Postgres connection string set. Run `vercel env pull .env.local --yes`.");
    _sql = neon(url);
  }
  return _sql;
}

export function isDbConfigured() {
  return connectionString() !== null;
}

/**
 * Idempotent — cheap enough to call on the write path so the table always exists.
 *
 * One row per response. Answers live in a single JSONB column, so adding,
 * removing or reordering questions never needs a migration. A key that is
 * ABSENT from `answers` means the respondent was never asked (wrong branch);
 * a key present with a null value means they were asked and skipped it.
 */
export async function ensureSchema() {
  const sql = getSql();
  await sql`
    create table if not exists responses (
      id          uuid primary key default gen_random_uuid(),
      created_at  timestamptz not null default now(),
      branch      text,
      answers     jsonb not null
    )
  `;
  await sql`alter table responses add column if not exists branch text`;
  await sql`create index if not exists responses_created_at_idx on responses (created_at desc)`;
}

export type ResponseRow = {
  id: string;
  created_at: string;
  branch: string | null;
  answers: Record<string, unknown>;
};
