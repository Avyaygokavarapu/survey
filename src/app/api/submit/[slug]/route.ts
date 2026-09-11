import { NextResponse } from "next/server";
import { handleSubmit } from "@/lib/submit";
import { getSurvey } from "@/lib/surveys";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const survey = getSurvey((await params).slug);
  if (!survey) return NextResponse.json({ error: "Unknown survey." }, { status: 404 });
  return handleSubmit(survey, req);
}
