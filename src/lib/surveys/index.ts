// ─────────────────────────────────────────────────────────────────────────────
// THE SURVEY REGISTRY — add a survey here and it gets a URL.
//
// 1. Write the instrument in its own module, exporting a `Survey`.
// 2. Import it and add it to `register(...)` below.
//
// It is then live at /<slug>, with admin at /admin/<slug>.
// ─────────────────────────────────────────────────────────────────────────────

import { familyHealth } from "./family-health";
import type { Question, Survey } from "./types";

/** Route segments that are already taken by the app itself. */
const RESERVED = new Set(["admin", "api", "robots.txt", "sitemap.xml", "_next", "favicon.ico"]);

function everyQuestion(s: Survey): Question[] {
  return [
    ...(s.routing ? [s.routing.question] : []),
    ...Object.values(s.routing?.branches ?? {}).flatMap((b) => b.questions),
    ...s.questions,
  ];
}

/**
 * Fail loudly at module load rather than silently mis-routing a respondent or
 * serving a survey whose answers would collide in one JSONB blob.
 */
function register(...list: Survey[]): Record<string, Survey> {
  const bySlug: Record<string, Survey> = {};

  for (const s of list) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(s.slug)) {
      throw new Error(`Survey slug "${s.slug}" must be lowercase letters, digits and hyphens.`);
    }
    if (RESERVED.has(s.slug)) throw new Error(`Survey slug "${s.slug}" is reserved by the app.`);
    if (bySlug[s.slug]) throw new Error(`Duplicate survey slug "${s.slug}".`);

    if (s.routing) {
      for (const option of s.routing.question.options) {
        if (!(option in s.routing.branchByAnswer)) {
          throw new Error(`[${s.slug}] Routing option "${option}" has no entry in branchByAnswer.`);
        }
      }
      for (const [option, branch] of Object.entries(s.routing.branchByAnswer)) {
        if (branch !== null && !(branch in s.routing.branches)) {
          throw new Error(`[${s.slug}] Routing option "${option}" points at unknown branch "${branch}".`);
        }
      }
    }

    const seen = new Set<string>();
    for (const q of everyQuestion(s)) {
      if (seen.has(q.id)) throw new Error(`[${s.slug}] Duplicate question id "${q.id}".`);
      seen.add(q.id);
    }

    bySlug[s.slug] = s;
  }

  return bySlug;
}

export const SURVEYS = register(familyHealth);

export const SURVEY_LIST: Survey[] = Object.values(SURVEYS);

/**
 * The survey served at `/`. A public link to it is already in circulation, so
 * this stays pointed at family-health.
 */
export const DEFAULT_SURVEY: Survey = SURVEYS["family-health"];

export function getSurvey(slug: string | undefined | null): Survey | null {
  if (!slug) return null;
  return SURVEYS[slug] ?? null;
}

export * from "./types";
