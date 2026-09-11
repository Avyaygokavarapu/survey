// ─────────────────────────────────────────────────────────────────────────────
// THE SURVEY ENGINE — nothing here knows about any particular survey.
//
// Each instrument lives in its own module (e.g. ./family-health.ts) and is
// registered in ./index.ts under a URL slug. The public form, server-side
// validation, the admin table and the CSV export are all generated from the
// `Survey` object an instrument exports.
//
// A survey is laid out in one of two ways:
//   • routing  — one question picks a branch, then a common tail (family-health)
//   • sections — a fixed run of titled pages (trader-psychology)
// Either way `questions` is the flat list everyone is eligible for; `sections`
// only groups them for display, and is derived from the same arrays.
// ─────────────────────────────────────────────────────────────────────────────

/** Show a question only when ANY of its conditions matches an earlier answer. */
export type Condition = { question: string; in: string[] };

type Base = {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Printed in the CSV header, e.g. "Q27". Keeps the data aligned with the design doc. */
  code?: string;
  showIf?: Condition[];
};

export type Question =
  | (Base & { type: "short"; placeholder?: string })
  | (Base & { type: "long"; placeholder?: string })
  | (Base & { type: "single"; options: string[]; layout?: "list" | "row" })
  | (Base & { type: "multi"; options: string[] })
  | (Base & { type: "scale"; min: number; max: number; minLabel?: string; maxLabel?: string });

export type SingleQuestion = Extract<Question, { type: "single" }>;

export type Branch = { id: string; title: string; questions: Question[] };

export type Section = { key: string; title: string; intro?: string; questions: Question[]; shuffle?: boolean };

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

/** A gate before anything else: some answers end the survey instead of continuing. */
export type Screening = {
  question: SingleQuestion;
  disqualifyIf: string[];
  /** Shown to a respondent who screens out. */
  message: string;
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
  screening?: Screening;
  routing?: Routing;
  /** Display grouping for a non-routing survey. Must cover exactly `questions`. */
  sections?: Section[];
  /** Asked of everyone, after any branch. For a flat survey this is the whole instrument. */
  questions: Question[];
};

export type Answers = Record<string, string | string[] | number | null>;

export function branchFor(survey: Survey, answer: string | null | undefined): string | null {
  if (!survey.routing || !answer) return null;
  return survey.routing.branchByAnswer[answer] ?? null;
}

/** True when a question's `showIf` is satisfied by the answers given so far. */
export function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  if (!q.showIf?.length) return true;
  return q.showIf.some((c) => {
    const v = answers[c.question];
    if (Array.isArray(v)) return v.some((x) => c.in.includes(String(x)));
    if (v === null || v === undefined || v === "") return false;
    return c.in.includes(String(v));
  });
}

/**
 * Exactly the questions a respondent giving this routing answer is eligible for
 * — not counting `showIf`, which depends on answers and is applied as they go.
 * The screening question is handled separately; see `allColumns`.
 */
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

function header(q: Question, fallback: string): string {
  return q.code ? `${q.code}. ${q.label}` : fallback;
}

/** Every column, branch- or section-labelled, for the admin table and the CSV export. */
export function allColumns(survey: Survey): Column[] {
  const screening: Column[] = survey.screening
    ? [{ q: survey.screening.question, group: "Screening", header: header(survey.screening.question, survey.screening.question.label) }]
    : [];

  if (survey.sections) {
    return [
      ...screening,
      ...survey.sections.flatMap((s) =>
        s.questions.map((q, i) => ({ q, group: s.title, header: header(q, `${i + 1}. ${q.label}`) })),
      ),
    ];
  }

  if (!survey.routing) {
    return [
      ...screening,
      ...survey.questions.map((q, i) => ({ q, group: "common", header: header(q, `Q${i + 1}. ${q.label}`) })),
    ];
  }

  const r = survey.routing;
  return [
    ...screening,
    { q: r.question, group: "role", header: header(r.question, r.question.label) },
    ...Object.keys(r.branches).flatMap((b) =>
      r.branches[b].questions.map((q, i) => ({ q, group: b, header: header(q, `${b}${i + 1}. ${q.label}`) })),
    ),
    ...survey.questions.map((q, i) => ({ q, group: "common", header: header(q, `Z${i + 1}. ${q.label}`) })),
  ];
}

export function columnsForBranch(survey: Survey, b: string | "all"): Column[] {
  const cols = allColumns(survey);
  if (!survey.routing) return cols;
  if (b === "all") return cols.filter((c) => c.group === "Screening" || c.group === "role" || c.group === "common");
  return cols.filter((c) => c.group === "Screening" || c.group === "role" || c.group === b || c.group === "common");
}

function checkOne(q: Question, v: unknown, errors: Record<string, string>, answers: Answers) {
  if (q.type === "multi") {
    const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const allowed = list.filter((x) => q.options.includes(x));
    if (q.required && allowed.length === 0) errors[q.id] = "Please select at least one option.";
    answers[q.id] = allowed;
    return;
  }

  if (q.type === "single") {
    const s = typeof v === "string" ? v.trim() : "";
    if (s && !q.options.includes(s)) { errors[q.id] = "Not a valid option."; return; }
    if (q.required && !s) errors[q.id] = "This question is required.";
    answers[q.id] = s || null;
    return;
  }

  if (q.type === "scale") {
    if (v === "" || v === null || v === undefined) {
      if (q.required) errors[q.id] = "This question is required.";
      answers[q.id] = null;
      return;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < q.min || n > q.max) errors[q.id] = `Please choose a value between ${q.min} and ${q.max}.`;
    else answers[q.id] = n;
    return;
  }

  const s = typeof v === "string" ? v.trim() : "";
  if (q.required && !s) errors[q.id] = "This question is required.";
  if (s.length > 5000) errors[q.id] = "Answer is too long (5000 characters max).";
  answers[q.id] = s || null;
}

/**
 * Validates against the questions this respondent was actually shown, and
 * silently drops anything outside that set — so a Branch C respondent cannot
 * post Branch A answers, and a hidden follow-up cannot be stuffed. Keys absent
 * from the result mean "was not asked", which is distinct from present-and-null
 * ("asked, left blank").
 */
export function validate(
  survey: Survey,
  raw: unknown,
): { ok: true; answers: Answers; branch: string | null } | { ok: false; errors: Record<string, string> } {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const answers: Answers = {};

  if (survey.screening) {
    const sq = survey.screening.question;
    const s = typeof body[sq.id] === "string" ? (body[sq.id] as string).trim() : "";
    if (!s) return { ok: false, errors: { [sq.id]: "This question is required." } };
    if (!sq.options.includes(s)) return { ok: false, errors: { [sq.id]: "Not a valid option." } };
    if (survey.screening.disqualifyIf.includes(s)) return { ok: false, errors: { [sq.id]: survey.screening.message } };
    answers[sq.id] = s;
  }

  let routeAnswer: string | null = null;
  if (survey.routing) {
    const rq = survey.routing.question;
    const s = typeof body[rq.id] === "string" ? (body[rq.id] as string).trim() : "";
    if (!s) return { ok: false, errors: { [rq.id]: "This question is required." } };
    if (!rq.options.includes(s)) return { ok: false, errors: { [rq.id]: "Not a valid option." } };
    routeAnswer = s;
  }

  // Questions are in presentation order, so a `showIf` can only reference an
  // answer already validated above it.
  for (const q of questionsFor(survey, routeAnswer)) {
    if (!isVisible(q, answers)) continue; // not shown → not asked → absent
    checkOne(q, body[q.id], errors, answers);
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, answers, branch: branchFor(survey, routeAnswer) };
}
