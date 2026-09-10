import { isAuthed } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { ensureSchema, getSql, isDbConfigured, type ResponseRow } from "@/lib/db";
import { ALL_COLUMNS } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return new Response("Unauthorized", { status: 401 });
  if (!isDbConfigured()) return new Response("No database configured", { status: 503 });

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`select id, created_at, branch, answers from responses order by created_at asc`) as unknown as ResponseRow[];

  // The CSV is deliberately wide — every question from every branch — so the
  // grid is analysable in Sheets. An empty cell means "not asked".
  const csv = toCsv(
    ["id", "submitted_at", "branch", ...ALL_COLUMNS.map((c) => c.header)],
    rows.map((r) => [
      r.id,
      new Date(r.created_at).toISOString(),
      r.branch ?? "",
      ...ALL_COLUMNS.map((c) => (c.q.id in (r.answers ?? {}) ? r.answers[c.q.id] : "")),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="family-health-survey-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
