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
 * The slug stamped on rows that predate multi-survey support. Every response is
 * now tagged with the survey it came from; rows written before that column
 * existed were all from the family-health instrument.
 *
 * ⚠️ Frozen, like a question id — it is stored on real rows. Postgres forbids
 * bound parameters in DDL, so the literal below is repeated inline in
 * `ensureSchema()`; the assertion there keeps the two from drifting.
 */
export const LEGACY_SURVEY_SLUG = "family-health";

/**
 * Idempotent — cheap enough to call on the write path so the table always exists.
 *
 * One row per response. Answers live in a single JSONB column, so adding,
 * removing or reordering questions never needs a migration. A key that is
 * ABSENT from `answers` means the respondent was never asked (wrong branch);
 * a key present with a null value means they were asked and skipped it.
 *
 * `survey` uses a NOT NULL DEFAULT so Postgres backfills existing rows as a
 * metadata-only operation — no UPDATE on a path that runs for every submit and
 * every admin page load.
 */
export async function ensureSchema() {
  // The DDL below hardcodes this value because it cannot be parameterised.
  if (LEGACY_SURVEY_SLUG !== "family-health") throw new Error("LEGACY_SURVEY_SLUG no longer matches the DDL default.");
  const sql = getSql();
  await sql`
    create table if not exists responses (
      id          uuid primary key default gen_random_uuid(),
      created_at  timestamptz not null default now(),
      survey      text not null default 'family-health',
      branch      text,
      answers     jsonb not null
    )
  `;
  await sql`alter table responses add column if not exists branch text`;
  await sql`alter table responses add column if not exists survey text not null default 'family-health'`;
  await sql`create index if not exists responses_created_at_idx on responses (created_at desc)`;
  await sql`create index if not exists responses_survey_created_at_idx on responses (survey, created_at desc)`;
}

export type ResponseRow = {
  id: string;
  created_at: string;
  survey: string;
  branch: string | null;
  answers: Record<string, unknown>;
};
