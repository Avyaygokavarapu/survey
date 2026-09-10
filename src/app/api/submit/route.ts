import { NextResponse } from "next/server";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";
import { validate } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "The survey is not connected to a database yet." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Validates against the respondent's branch only, and drops any key outside it.
  const result = validate(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    await ensureSchema();
    const sql = getSql();
    // Answers only — no IP, no user-agent. Nothing identifying beyond what a
    // question explicitly asks for.
    await sql`
      insert into responses (branch, answers)
      values (${result.branch}, ${JSON.stringify(result.answers)}::jsonb)
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("submit failed", err);
    return NextResponse.json({ error: "Could not save your response. Please try again." }, { status: 500 });
  }
}
