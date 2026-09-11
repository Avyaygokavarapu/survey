import { handleSubmit } from "@/lib/submit";
import { DEFAULT_SURVEY } from "@/lib/surveys";

export const dynamic = "force-dynamic";

/**
 * Legacy endpoint — the form posted here before surveys had slugs. Kept so a
 * respondent part-way through the form on cached JS does not lose their
 * answers. New submissions go to /api/submit/<slug>.
 */
export async function POST(req: Request) {
  return handleSubmit(DEFAULT_SURVEY, req);
}
