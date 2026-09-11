// ─────────────────────────────────────────────────────────────────────────────
// THE SURVEY ENGINE — nothing here knows about any particular survey.
//
// Each instrument lives in its own module (e.g. ./family-health.ts) and is
// registered in ./index.ts under a URL slug. The public form, server-side
// validation, the admin table and the CSV export are all generated from the
// `Survey` object an instrument exports.
// ─────────────────────────────────────────────────────────────────────────────

export type Question =
  | { id: string; type: "short"; label: string; help?: string; required?: boolean; placeholder?: string }
  | { id: string; type: "long"; label: string; help?: string; required?: boolean; placeholder?: string }
  | { id: string; type: "single"; label: string; help?: string; required?: boolean; options: string[] }
  | { id: string; type: "multi"; label: string; help?: string; required?: boolean; options: string[] }
  | { id: string; type: "scale"; label: string; help?: string; required?: boolean; min: number; max: number; minLabel?: string; maxLabel?: string };

export type SingleQuestion = Extract<Question, { type: "single" }>;

export type Branch = { id: string; title: string; questions: Question[] };

/**
 * Optional first step. One single-select question whose answer routes the
 * respondent into exactly one branch; `null` in `branchByAnswer` sends them
 * straight to the common tail. A survey without routing is simply a flat list.
 */
export type Routing = {
  question: SingleQuestion;
  branchByAnswer: Record<string, string | null>;
  branches: Record<string, Branch>;
};

export type Survey = {
  /** URL segment: /<slug>. Frozen once responses exist — it is stored on every row. */
  slug: string;
  title: string;
  intro: string;
  /** Shown under the form. */
  footer: string;
  /** Filename stem for the CSV export. */
  csvBasename: string;
  /** Heading for the step holding `questions`, when the survey has routing. */
  tailTitle?: string;
  routing?: Routing;
  /** Asked of everyone, after any branch. For a flat survey this is the whole instrument. */
  questions: Question[];
};

export type Answers = Record<string, string | string[] | number | null>;

export function branchFor(survey: Survey, answer: string | null | undefined): string | null {
  if (!survey.routing || !answer) return null;
  return survey.routing.branchByAnswer[answer] ?? null;
}

/** Exactly the questions a respondent giving this routing answer is asked — nothing more. */
export function questionsFor(survey: Survey, answer?: string | null): Question[] {
  if (!survey.routing) return survey.questions;
  const b = branchFor(survey, answer);
  return [
    survey.routing.question,
    ...(b ? survey.routing.branches[b].questions : []),
    ...survey.questions,
  ];
}

export type Column = { q: Question; group: string; header: string };

/** Every column, branch-prefixed, for the admin table and the CSV export. */
export function allColumns(survey: Survey): Column[] {
  if (!survey.routing) {
    return survey.questions.map((q, i) => ({ q, group: "common", header: `Q${i + 1}. ${q.label}` }));
  }
  const r = survey.routing;
  return [
    { q: r.question, group: "role", header: r.question.label },
    ...Object.keys(r.branches).flatMap((b) =>
      r.branches[b].questions.map((q, i) => ({ q, group: b, header: `${b}${i + 1}. ${q.label}` })),
    ),
    ...survey.questions.map((q, i) => ({ q, group: "common", header: `Z${i + 1}. ${q.label}` })),
  ];
}

export function columnsForBranch(survey: Survey, b: string | "all"): Column[] {
  const cols = allColumns(survey);
  if (b === "all") return cols.filter((c) => c.group === "role" || c.group === "common");
  return cols.filter((c) => c.group === "role" || c.group === b || c.group === "common");
}

/**
 * Validates against the questions this respondent's routing answer actually
 * leads to, and silently drops anything outside that set — so a Branch C
 * respondent cannot post Branch A answers. Keys absent from the result mean
 * "was not asked", which is distinct from present-and-null ("asked, left blank").
 */
export function validate(
  survey: Survey,
  raw: unknown,
): { ok: true; answers: Answers; branch: string | null } | { ok: false; errors: Record<string, string> } {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  let routeAnswer: string | null = null;
  if (survey.routing) {
    const rq = survey.routing.question;
    const s = typeof body[rq.id] === "string" ? (body[rq.id] as string).trim() : "";
    if (!s) return { ok: false, errors: { [rq.id]: "This question is required." } };
    if (!rq.options.includes(s)) return { ok: false, errors: { [rq.id]: "Not a valid option." } };
    routeAnswer = s;
  }

  const errors: Record<string, string> = {};
  const answers: Answers = {};

  for (const q of questionsFor(survey, routeAnswer)) {
    const v = body[q.id];

    if (q.type === "multi") {
      const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const allowed = list.filter((x) => q.options.includes(x));
      if (q.required && allowed.length === 0) errors[q.id] = "Please select at least one option.";
      answers[q.id] = allowed;
      continue;
    }

    if (q.type === "single") {
      const s = typeof v === "string" ? v.trim() : "";
      if (s && !q.options.includes(s)) { errors[q.id] = "Not a valid option."; continue; }
      if (q.required && !s) errors[q.id] = "This question is required.";
      answers[q.id] = s || null;
      continue;
    }

    if (q.type === "scale") {
      if (v === "" || v === null || v === undefined) {
        if (q.required) errors[q.id] = "This question is required.";
        answers[q.id] = null;
        continue;
      }
      const n = Number(v);
      if (!Number.isFinite(n) || n < q.min || n > q.max) errors[q.id] = `Please choose a value between ${q.min} and ${q.max}.`;
      else answers[q.id] = n;
      continue;
    }

    const s = typeof v === "string" ? v.trim() : "";
    if (q.required && !s) errors[q.id] = "This question is required.";
    if (s.length > 5000) errors[q.id] = "Answer is too long (5000 characters max).";
    answers[q.id] = s || null;
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, answers, branch: branchFor(survey, routeAnswer) };
}
