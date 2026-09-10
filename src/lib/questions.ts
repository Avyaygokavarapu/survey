// ─────────────────────────────────────────────────────────────────────────────
// THE SURVEY INSTRUMENT — the only file you edit to change the survey.
//
// The public form, server-side validation, the admin table and the CSV export
// are all generated from what is below.
//
// Structure: one routing question → one branch (A / B / C) → four common
// questions everyone answers. `Other` skips straight to the common tail.
//
// ⚠️ Keep every `id` stable once responses exist — it is the JSON key the
// answer is stored under. Editing a `label` is always safe.
// ─────────────────────────────────────────────────────────────────────────────

export type Question =
  | { id: string; type: "short"; label: string; help?: string; required?: boolean; placeholder?: string }
  | { id: string; type: "long"; label: string; help?: string; required?: boolean; placeholder?: string }
  | { id: string; type: "single"; label: string; help?: string; required?: boolean; options: string[] }
  | { id: string; type: "multi"; label: string; help?: string; required?: boolean; options: string[] }
  | { id: string; type: "scale"; label: string; help?: string; required?: boolean; min: number; max: number; minLabel?: string; maxLabel?: string };

export const SURVEY_TITLE = "How Families Manage Each Other's Health";

export const SURVEY_INTRO =
  "We're studying how Indian families help each other stay healthy — from food and exercise to medicines, tests and doctor visits. This 3–4 minute survey is about your current behaviour, not medical details. Responses will be used only for research.";

// ── Routing ──────────────────────────────────────────────────────────────────

export const ROLE_ID = "role";

export const ROUTING: Question = {
  id: ROLE_ID,
  type: "single",
  label: "Which best describes you in your family?",
  required: true,
  options: [
    "Young adult / adult child (18–30)",
    "Parent (roughly 40–65)",
    "Older adult / grandparent (65+)",
    "Caregiver for another family member",
    "Other",
  ],
};

export type BranchId = "A" | "B" | "C";

/** Which branch each routing option leads to. `null` → straight to the common tail. */
export const BRANCH_BY_ROLE: Record<string, BranchId | null> = {
  "Young adult / adult child (18–30)": "A",
  "Parent (roughly 40–65)": "B",
  "Older adult / grandparent (65+)": "C",
  "Caregiver for another family member": "A", // manage-someone-else's-health branch
  Other: null,
};

// ── Branch A — adult children, looking toward parents ────────────────────────

const BRANCH_A: Question[] = [
  {
    id: "a1_involvement",
    type: "single",
    label: "How involved are you in managing your parents' health?",
    options: ["Not involved", "Occasionally check", "Regularly remind them", "Actively track or coordinate"],
  },
  {
    id: "a2_helps_with",
    type: "multi",
    label: "What do you currently help your parents with?",
    help: "Select all that apply.",
    options: ["Food/nutrition", "Exercise", "Medicines", "Doctor appointments", "Diagnostic tests", "Health reports", "Insurance/payments", "Nothing"],
  },
  {
    id: "a3_ask_frequency",
    type: "single",
    label: "How often do you ask something like “Did you take your medicine?”, “Did you exercise?”, or “What did you eat today?”",
    options: ["Daily", "Few times a week", "Weekly", "Rarely", "Never"],
  },
  {
    id: "a4_verification",
    type: "single",
    label: "How do you currently know whether they actually followed through?",
    options: ["They tell me", "WhatsApp/call", "Reports/screenshots", "Wearable/app", "I usually don't know"],
  },
  {
    id: "a5_last_advice",
    type: "single",
    label: "Think of the last time you gave a parent health advice. What happened?",
    options: ["They followed consistently", "Followed temporarily", "Said yes but I couldn't verify", "Ignored it", "Don't know"],
  },
  {
    id: "a6_frustration",
    type: "single",
    label: "What frustrates you most?",
    options: ["Not knowing what they're actually doing", "Repeating reminders", "Understanding reports", "Coordinating doctors/tests", "Distance", "They don't want me involved"],
  },
  {
    id: "a7_score_useful",
    type: "single",
    label: "Would a daily 0–100 “health adherence score” for a consenting parent be useful to you?",
    options: ["Very useful", "Somewhat", "Neutral", "Uncomfortable", "Very uncomfortable"],
  },
  {
    id: "a8_score_contents",
    type: "multi",
    label: "What would you want that score to include?",
    help: "Select all that apply.",
    options: ["Protein/nutrition", "Exercise", "Sleep", "Medicines", "Steps/activity", "Health readings", "Doctor recommendations"],
  },
  {
    id: "a9_exception_alerts",
    type: "single",
    label: "Would you allow an AI agent to alert you only when something needs attention rather than sending everything?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    id: "a10_wish_knew",
    type: "long",
    label: "What is one thing about your parents' health you wish you knew without having to ask them?",
  },
];

// ── Branch B — parents, in the middle of the family graph ────────────────────

const BRANCH_B: Question[] = [
  {
    id: "b1_worry_about",
    type: "single",
    label: "Whose health do you currently worry about or help manage?",
    options: ["My children", "My spouse", "My parents", "Myself", "Multiple family members"],
  },
  {
    id: "b2_remind_about",
    type: "multi",
    label: "What health-related things do you remind family members about?",
    help: "Select all that apply.",
    options: ["Food", "Exercise", "Medicines", "Sleep", "Doctor visits", "Tests", "Nothing"],
  },
  {
    id: "b3_reminded_by",
    type: "single",
    label: "Does anyone in your family regularly remind YOU about your health?",
    options: ["Daily", "Weekly", "Occasionally", "Rarely", "Never"],
  },
  {
    id: "b4_advice_sticks",
    type: "single",
    label: "When someone tells you “eat better,” “exercise more,” or “take care of your health,” how often does it change your behaviour for more than a week?",
    options: ["Almost always", "Sometimes", "Rarely", "Never"],
  },
  {
    id: "b5_consistency_helpers",
    type: "multi",
    label: "What would make you more likely to stay consistent?",
    help: "Select all that apply.",
    options: ["Clear daily target", "Seeing a score", "Family accountability", "Doctor monitoring", "Reminders", "Rewards", "Nothing"],
  },
  {
    id: "b6_would_share",
    type: "single",
    label: "Would you share selected health information with your adult child/spouse if you controlled exactly what they could see?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    id: "b7_comfortable_sharing",
    type: "multi",
    label: "What would you be comfortable sharing?",
    help: "Select all that apply.",
    options: ["Exercise", "Nutrition", "Sleep", "Medicine adherence", "Test results", "Doctor recommendations", "Nothing"],
  },
  {
    id: "b8_not_share",
    type: "long",
    label: "What would you NOT want family members seeing?",
  },
  {
    id: "b9_visibility_preference",
    type: "single",
    label: "Would you prefer your family to see every detail or only receive an alert when you are consistently missing an important target?",
    options: ["Every detail", "Weekly summary", "Only important alerts", "Nothing"],
  },
  {
    id: "b10_why_stopped",
    type: "long",
    label: "Think about the last health goal you failed to maintain. Why did you stop?",
  },
];

// ── Branch C — older parents / grandparents ──────────────────────────────────

const BRANCH_C: Question[] = [
  {
    id: "c1_who_helps",
    type: "single",
    label: "Who usually helps you with health-related decisions?",
    options: ["Myself", "Spouse", "Children", "Doctor", "Other relative/caregiver"],
  },
  {
    id: "c2_how_tell_family",
    type: "single",
    label: "How do you usually tell family members about your health?",
    options: ["Phone call", "WhatsApp message", "Photo", "Video call", "In person", "I usually don't"],
  },
  {
    id: "c3_easiest_recording",
    type: "single",
    label: "Which is easiest for recording what you ate or how you feel?",
    options: ["Speaking", "Typing", "Sending a photo", "Filling a form", "I wouldn't record it"],
  },
  {
    id: "c4_voice_to_ai",
    type: "single",
    label: "Would you be comfortable saying something like “I ate two rotis, dal and curd” to an AI instead of typing it?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    id: "c5_immediate_nudge",
    type: "single",
    label: "Would you want it to tell you immediately when you are falling behind on something your doctor/family has asked you to do?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    id: "c6_allow_child_alert",
    type: "single",
    label: "Would you allow your son/daughter to receive an alert if you repeatedly missed an important health target?",
    options: ["Yes", "Only for serious things", "No"],
  },
  {
    id: "c7_hardest_task",
    type: "single",
    label: "What health task do you find hardest to do consistently?",
    options: ["Medicines", "Diet", "Exercise", "Tests", "Appointments", "Sleep", "Other"],
  },
  {
    id: "c8_why_difficult",
    type: "long",
    label: "Why is it difficult?",
  },
];

export const BRANCHES: Record<BranchId, { id: BranchId; title: string; questions: Question[] }> = {
  A: { id: "A", title: "About your parents' health", questions: BRANCH_A },
  B: { id: "B", title: "About your family's health and your own", questions: BRANCH_B },
  C: { id: "C", title: "About your own health", questions: BRANCH_C },
};

// ── Common tail — everyone answers these, so they are comparable across branches ──

export const COMMON: Question[] = [
  {
    id: "z1_fails_first",
    type: "single",
    label: "When someone in your family is trying to become healthier, what usually fails first?",
    options: ["Knowing what to do", "Remembering", "Doing it consistently", "Family coordination", "Measuring progress", "Motivation"],
  },
  {
    id: "z2_advice_vs_tracking",
    type: "single",
    label: "Which would help more?",
    options: [
      "A) Better health advice",
      "B) Someone/something keeping track of whether I actually followed the advice",
    ],
  },
  {
    id: "z3_report_card_reaction",
    type: "single",
    label: "Imagine an AI that privately tracks each consenting family member and gives them a daily report card. What is your immediate reaction?",
    options: ["Would definitely use", "Probably use", "Unsure", "Probably wouldn't", "Definitely wouldn't"],
  },
  { id: "z4_why", type: "long", label: "Why?" },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

// Fail loudly at module load rather than silently mis-routing a respondent.
for (const option of (ROUTING as Extract<Question, { type: "single" }>).options) {
  if (!(option in BRANCH_BY_ROLE)) {
    throw new Error(`Routing option "${option}" has no entry in BRANCH_BY_ROLE.`);
  }
}

export function branchFor(role: string | null | undefined): BranchId | null {
  if (!role) return null;
  return BRANCH_BY_ROLE[role] ?? null;
}

/** Exactly the questions a respondent with this role is asked — nothing more. */
export function questionsFor(role: string | null | undefined): Question[] {
  const b = branchFor(role);
  return [ROUTING, ...(b ? BRANCHES[b].questions : []), ...COMMON];
}

export type Column = { q: Question; group: "role" | BranchId | "common"; header: string };

/** Every column, branch-prefixed, for the admin table and the CSV export. */
export const ALL_COLUMNS: Column[] = [
  { q: ROUTING, group: "role", header: ROUTING.label },
  ...(["A", "B", "C"] as BranchId[]).flatMap((b) =>
    BRANCHES[b].questions.map((q, i) => ({ q, group: b, header: `${b}${i + 1}. ${q.label}` })),
  ),
  ...COMMON.map((q, i) => ({ q, group: "common" as const, header: `Z${i + 1}. ${q.label}` })),
];

export function columnsForBranch(b: BranchId | "all"): Column[] {
  if (b === "all") return ALL_COLUMNS.filter((c) => c.group === "role" || c.group === "common");
  return ALL_COLUMNS.filter((c) => c.group === "role" || c.group === b || c.group === "common");
}

export type Answers = Record<string, string | string[] | number | null>;

/**
 * Validates against the questions this respondent's role actually leads to, and
 * silently drops anything outside that set — so a Branch C respondent cannot
 * post Branch A answers. Keys absent from the result mean "was not asked",
 * which is distinct from present-and-null ("asked, left blank").
 */
export function validate(
  raw: unknown,
): { ok: true; answers: Answers; branch: BranchId | null } | { ok: false; errors: Record<string, string> } {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const routing = ROUTING as Extract<Question, { type: "single" }>;

  const role = typeof body[ROLE_ID] === "string" ? (body[ROLE_ID] as string).trim() : "";
  if (!role) return { ok: false, errors: { [ROLE_ID]: "This question is required." } };
  if (!routing.options.includes(role)) return { ok: false, errors: { [ROLE_ID]: "Not a valid option." } };

  const errors: Record<string, string> = {};
  const answers: Answers = {};

  for (const q of questionsFor(role)) {
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
    : { ok: true, answers, branch: branchFor(role) };
}
