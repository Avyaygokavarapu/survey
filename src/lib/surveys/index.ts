// ─────────────────────────────────────────────────────────────────────────────
// THE SURVEY REGISTRY — add a survey here and it gets a URL.
//
// 1. Write the instrument in its own module, exporting a `Survey`.
// 2. Import it and add it to `register(...)` below.
//
// It is then live at /<slug>, with admin at /admin/<slug>.
// ─────────────────────────────────────────────────────────────────────────────

import { familyHealth } from "./family-health";
import { traderPsychology } from "./trader-psychology";
import type { Question, Survey } from "./types";

/** Route segments that are already taken by the app itself. */
const RESERVED = new Set(["admin", "api", "robots.txt", "sitemap.xml", "_next", "favicon.ico"]);

/** Presentation order — a `showIf` may only look backwards along this list. */
function everyQuestion(s: Survey): Question[] {
  return [
    ...(s.screening ? [s.screening.question] : []),
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

    const ordered = everyQuestion(s);
    const seen = new Set<string>();
    for (const q of ordered) {
      if (seen.has(q.id)) throw new Error(`[${s.slug}] Duplicate question id "${q.id}".`);
      seen.add(q.id);
    }

    // `sections` is only a display grouping; it must cover `questions` exactly.
    if (s.sections) {
      const flat = s.sections.flatMap((sec) => sec.questions).map((q) => q.id).join(",");
      if (flat !== s.questions.map((q) => q.id).join(",")) {
        throw new Error(`[${s.slug}] sections do not match questions — derive questions from sections.`);
      }
    }

    // A conditional question whose trigger is mistyped would hide itself for
    // every respondent, silently and forever. Catch it at load instead.
    const at = new Map(ordered.map((q, i) => [q.id, i]));
    ordered.forEach((q, i) => {
      for (const c of q.showIf ?? []) {
        const j = at.get(c.question);
        if (j === undefined) throw new Error(`[${s.slug}] "${q.id}" has showIf on unknown question "${c.question}".`);
        if (j >= i) throw new Error(`[${s.slug}] "${q.id}" has showIf on "${c.question}", which is not asked before it.`);
        const trigger = ordered[j];
        if (trigger.type !== "single" && trigger.type !== "multi") {
          throw new Error(`[${s.slug}] "${q.id}" has showIf on "${c.question}", which has no options.`);
        }
        for (const v of c.in) {
          if (!trigger.options.includes(v)) {
            throw new Error(`[${s.slug}] "${q.id}" has showIf value "${v}" that is not an option of "${c.question}".`);
          }
        }
      }
    });

    bySlug[s.slug] = s;
  }

  return bySlug;
}

export const SURVEYS = register(familyHealth, traderPsychology);

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
