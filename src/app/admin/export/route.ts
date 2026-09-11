import { redirect } from "next/navigation";
import { DEFAULT_SURVEY } from "@/lib/surveys";

export const dynamic = "force-dynamic";

/** Legacy bookmark — exports now live under /admin/<slug>/export. */
export async function GET() {
  redirect(`/admin/${DEFAULT_SURVEY.slug}/export`);
}
