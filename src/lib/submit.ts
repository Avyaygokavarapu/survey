import { NextResponse } from "next/server";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";
import { validate, type Survey } from "@/lib/surveys";

/** Shared by /api/submit/<slug> and the legacy /api/submit. */
export async function handleSubmit(survey: Survey, req: Request) {
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
  const result = validate(survey, body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    await ensureSchema();
    const sql = getSql();
    // Answers only — no IP, no user-agent. Nothing identifying beyond what a
    // question explicitly asks for.
    await sql`
      insert into responses (survey, branch, answers)
      values (${survey.slug}, ${result.branch}, ${JSON.stringify(result.answers)}::jsonb)
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(`submit failed [${survey.slug}]`, err);
    return NextResponse.json({ error: "Could not save your response. Please try again." }, { status: 500 });
  }
}
