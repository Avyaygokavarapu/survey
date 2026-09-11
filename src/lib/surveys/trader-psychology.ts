// ─────────────────────────────────────────────────────────────────────────────
// INSTRUMENT: trader psychology — served at /tradingpsych.
//
// Edit only this file to change this survey. The engine lives in ./types.ts and
// the slug is registered in ./index.ts.
//
// Structure: a screening gate, then seven sections. Two follow-ups (Q8B, Q33B)
// appear only for respondents whose earlier answer triggers them.
//
// ⚠️ Keep every `id` stable once responses exist — it is the JSON key the
// answer is stored under. Editing a `label` is always safe.
//
// `code` is CSV-only: it never appears on the form, so scoring keys such as
// "[R]" (reverse-scored) and the Mini-IPIP trait signs ride through to the
// export without cueing respondents.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question, Section, SingleQuestion, Survey } from "./types";

const FREQUENCY = ["Never", "Rarely", "Sometimes", "Often", "Very often"];
const OFTEN = ["Often", "Very often"];

/** "How much does this sound like you?" — stored as 1–5 so traits can be summed. */
function likert(id: string, code: string, label: string): Question {
  return { id, code, label, type: "scale", min: 1, max: 5, minLabel: "Not at all like me", maxLabel: "Extremely like me" };
}

/** Frequency items are single-select so branching can match the exact wording. */
function frequency(id: string, code: string, label: string): Question {
  return { id, code, label, type: "single", options: FREQUENCY, layout: "row" };
}

/** Mini-IPIP items use the standard IPIP accuracy scale. */
function ipip(id: string, code: string, label: string): Question {
  return { id, code, label, type: "scale", min: 1, max: 5, minLabel: "Very inaccurate", maxLabel: "Very accurate" };
}

// ── Screening ────────────────────────────────────────────────────────────────

const SCREENING: SingleQuestion = {
  id: "q0_traded",
  code: "Q0",
  type: "single",
  label: "Have you ever actively made financial trading decisions involving real money?",
  required: true,
  options: ["Yes, I currently trade", "Yes, but I don't currently trade", "No"],
};

// ── Section 1 — Who are you as a trader? ─────────────────────────────────────

const PROFILE: Question[] = [
  {
    id: "q1_experience", code: "Q1", type: "single",
    label: "How long have you been trading?",
    options: ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"],
  },
  {
    id: "q2_trader_type", code: "Q2", type: "single",
    label: "Which best describes you?",
    options: ["Retail / individual trader", "Professional trader", "Portfolio / fund manager", "Proprietary trader", "Quant / systematic trader", "Former trader", "Other"],
  },
  {
    id: "q3_instrument", code: "Q3", type: "single",
    label: "What do you trade most frequently?",
    options: ["Equities", "Futures", "Options", "FX", "Commodities", "Crypto", "Multiple asset classes", "Other"],
  },
  {
    id: "q4_decision_frequency", code: "Q4", type: "single",
    label: "How frequently do you typically make trading decisions?",
    options: ["Multiple times a day", "Daily", "Several times a week", "Weekly", "Less frequently"],
  },
  {
    id: "q5_holding_period", code: "Q5", type: "single",
    label: "Your typical holding period?",
    options: ["Minutes", "Hours", "1–5 days", "Weeks", "Months or longer"],
  },
  {
    id: "q6_whose_capital", code: "Q6", type: "single",
    label: "Whose capital are you primarily trading?",
    options: ["Entirely my own", "Mostly my own", "A mix of my own and others'", "Mostly others' / institutional", "Entirely institutional / client capital"],
  },
];

// ── Section 2 — The 60-second trading mirror ─────────────────────────────────

const MIRROR: Question[] = [
  {
    id: "q7_moves_against", code: "Q7", type: "single",
    label: "You enter a trade with high conviction. It immediately moves sharply against you.",
    help: "Imagine each situation actually happened today. What are you MOST likely to do?",
    options: [
      "A. Exit because the setup has changed.",
      "B. Re-check the thesis before deciding.",
      "C. Give it more room than originally planned.",
      "D. Add to the position because the opportunity now looks even better.",
    ],
  },
  {
    id: "q8_losing_streak", code: "Q8", type: "single",
    label: "You have three losing trades in a row. A fourth opportunity appears.",
    options: [
      "Stop trading for the day.",
      "Take it only if it meets my predefined criteria.",
      "Take it — every trade should be judged independently.",
      "Increase the size; one good trade can recover the day.",
    ],
  },
  {
    id: "q8b_thinking", code: "Q8B", type: "single",
    label: "Which comes closest to what you would be thinking?",
    showIf: [{ question: "q8_losing_streak", in: ["Increase the size; one good trade can recover the day."] }],
    options: [
      "“I need to get back to break-even.”",
      "“The odds are now in my favour.”",
      "“I don't want the day to end like this.”",
      "“The opportunity genuinely warrants a larger position.”",
    ],
  },
  {
    id: "q9_closed_then_moved", code: "Q9", type: "single",
    label: "You close a position at a loss. Ten minutes later, it moves exactly where you originally predicted. Your strongest reaction would be:",
    options: [
      "“That's trading.”",
      "Frustration with the process.",
      "Frustration with myself.",
      "A strong urge to re-enter.",
      "A strong urge to prove my original view was right.",
    ],
  },
  {
    id: "q10_public_disagreement", code: "Q10", type: "single",
    label: "Another trader publicly disagrees with your highest-conviction position. What bothers you most?",
    options: [
      "Nothing particularly bothers me.",
      "That they may know something I don't.",
      "That others might think my analysis is wrong.",
      "That I may actually be wrong.",
      "The way they challenged me.",
    ],
  },
];

// ── Section 3 — How much does this sound like you? ───────────────────────────
// Control & certainty, validation & status, emotional reactivity, cognitive
// rigidity, autonomy. Presented in random order to reduce block effects.

const GPP: Question[] = [
  likert("q11_uncertainty_bothers", "Q11", "Not knowing what will happen bothers me more than I usually admit."),
  likert("q12_regain_control", "Q12", "When events stop making sense to me, I feel a strong need to regain control."),
  likert("q13_change_mind", "Q13 [R]", "I can comfortably change my mind when new information contradicts my original view."),
  likert("q14_proven_wrong", "Q14", "Being proven wrong bothers me even when there are no meaningful consequences."),
  likert("q15_others_success", "Q15", "Other people's success sometimes changes how I evaluate my own performance."),
  likert("q16_rarely_justify", "Q16 [R]", "I rarely feel the need to justify a decision once I know it was reasonable."),
  likert("q17_setback_mood", "Q17", "A setback can affect my mood longer than I would like."),
  likert("q18_urge_to_act", "Q18", "After something goes badly, I feel an urge to do something rather than simply wait."),
  likert("q19_recover_quickly", "Q19 [R]", "I recover emotionally from mistakes quite quickly."),
  likert("q20_abandon_explanation", "Q20", "Once I have built a strong explanation for something, abandoning it is difficult."),
  likert("q21_confirming_evidence", "Q21", "I sometimes look harder for evidence supporting my view than evidence contradicting it."),
  likert("q22_enjoy_being_wrong", "Q22 [R]", "I genuinely enjoy discovering that my original explanation was wrong."),
  likert("q23_own_decisions", "Q23", "I strongly prefer situations where outcomes depend primarily on my own decisions."),
  likert("q24_someone_else_controls", "Q24", "Having someone else control an important decision makes me uncomfortable."),
  likert("q25_comfortable_delegating", "Q25 [R]", "I am comfortable delegating important decisions when someone else has better information."),
];

// ── Section 4 — Trading under pressure ───────────────────────────────────────

const BEHAVIOUR: Question[] = [
  frequency("q26_broke_own_rules", "Q26", "Taken a trade that violated one of your own rules."),
  frequency("q27_recover_earlier_loss", "Q27", "Continued trading mainly because you wanted to recover an earlier loss."),
  frequency("q28_increased_risk_after_loss", "Q28", "Increased risk after losing money."),
  frequency("q29_held_loser_too_long", "Q29", "Held a losing position longer than your original plan justified."),
  frequency("q30_exited_winner_early", "Q30", "Exited a profitable position earlier than planned because you were afraid the profit would disappear."),
  frequency("q31_overtraded", "Q31", "Taken more trades than you originally intended that day or week."),
  frequency("q32_checked_needlessly", "Q32", "Checked a position or the market even though you knew there was no need to act."),
  frequency("q33_moved_stop_loss", "Q33", "Changed or ignored a stop-loss after entering a position."),
  {
    id: "q33b_trying_to_recover", code: "Q33B", type: "single",
    label: "When this happens, what are you usually trying hardest to recover?",
    showIf: [
      { question: "q27_recover_earlier_loss", in: OFTEN },
      { question: "q28_increased_risk_after_loss", in: OFTEN },
      { question: "q33_moved_stop_loss", in: OFTEN },
    ],
    options: ["Money", "Confidence", "Control", "Being “right”", "My day's performance", "I don't know"],
  },
];

// ── Section 5 — Beyond the trade ─────────────────────────────────────────────

const SPILLOVER: Question[] = [
  frequency("q34_keep_thinking", "Q34", "I continue thinking about the market after I have stopped trading."),
  frequency("q35_mood_around_others", "Q35", "My mood is noticeably different around other people."),
  frequency("q36_quieter_irritable", "Q36", "I become quieter, more irritable or less patient."),
  frequency("q37_sleep_affected", "Q37", "My sleep is affected."),
  frequency("q38_check_outside_hours", "Q38", "I check prices or news outside my normal trading hours."),
  frequency("q39_harder_to_concentrate", "Q39", "It becomes harder to concentrate on unrelated work or conversations."),
  frequency("q40_can_disconnect", "Q40 [R]", "I can mentally disconnect from the market relatively quickly."),
];

const CHANGE: Question[] = [
  {
    id: "q41_uncertainty_outside", code: "Q41", type: "single",
    label: "Has becoming a trader changed how you deal with uncertainty outside financial markets?",
    options: ["Much less comfortable with uncertainty", "Slightly less comfortable", "No noticeable change", "Slightly more comfortable", "Much more comfortable"],
  },
  {
    id: "q42_risk_outside", code: "Q42", type: "single",
    label: "Has trading changed how comfortable you are taking risks outside markets?",
    options: ["Much less comfortable taking risks", "Slightly less comfortable", "No noticeable change", "Slightly more comfortable", "Much more comfortable"],
  },
  {
    id: "q43_being_told_wrong", code: "Q43", type: "single",
    label: "Has trading changed how you respond when someone tells you that you're wrong?",
    options: ["Much more defensive", "Slightly more defensive", "No noticeable change", "Slightly more open", "Much more open"],
  },
];

// ── Section 6 — Mini-IPIP (Donnellan, Oswald, Baird & Lucas, 2006) ───────────
//
// Items and scoring key verbatim from the International Personality Item Pool
// (ipip.ori.org/MiniIPIPKey.htm). Wording is deliberately NOT edited — the
// scale's validity depends on it. Codes carry the trait and sign:
//   E/A/C/N/I = Extraversion, Agreeableness, Conscientiousness, Neuroticism,
//   Intellect-Imagination;  "+" keyed positive, "-" reverse-scored.
// Presented in the standard interleaved order rather than grouped by trait.

const PERSONALITY: Question[] = [
  ipip("ipip_01", "P1 E+", "Am the life of the party."),
  ipip("ipip_02", "P2 A+", "Sympathize with others' feelings."),
  ipip("ipip_03", "P3 C+", "Get chores done right away."),
  ipip("ipip_04", "P4 N+", "Have frequent mood swings."),
  ipip("ipip_05", "P5 I+", "Have a vivid imagination."),
  ipip("ipip_06", "P6 E-", "Don't talk a lot."),
  ipip("ipip_07", "P7 A-", "Am not interested in other people's problems."),
  ipip("ipip_08", "P8 C-", "Often forget to put things back in their proper place."),
  ipip("ipip_09", "P9 N-", "Am relaxed most of the time."),
  ipip("ipip_10", "P10 I-", "Have difficulty understanding abstract ideas."),
  ipip("ipip_11", "P11 E+", "Talk to a lot of different people at parties."),
  ipip("ipip_12", "P12 A+", "Feel others' emotions."),
  ipip("ipip_13", "P13 C+", "Like order."),
  ipip("ipip_14", "P14 N+", "Get upset easily."),
  ipip("ipip_15", "P15 I-", "Do not have a good imagination."),
  ipip("ipip_16", "P16 E-", "Keep in the background."),
  ipip("ipip_17", "P17 A-", "Am not really interested in others."),
  ipip("ipip_18", "P18 C-", "Make a mess of things."),
  ipip("ipip_19", "P19 N-", "Seldom feel blue."),
  ipip("ipip_20", "P20 I-", "Am not interested in abstract ideas."),
];

// ── Section 7 — The three questions worth keeping ────────────────────────────

const CLOSING: Question[] = [
  {
    id: "q44_uncomfortable_to_admit", code: "Q44", type: "single",
    label: "Which sentence feels MOST uncomfortable to admit?",
    options: [
      "“Sometimes I care more about being right than making the best decision.”",
      "“Losses affect my confidence more than I show.”",
      "“Other people's success affects me.”",
      "“I don't always know when persistence becomes stubbornness.”",
      "“I find uncertainty harder than I pretend.”",
      "None of these particularly bother me.",
    ],
  },
  {
    id: "q45_hardest_part", code: "Q45", type: "short",
    label: "The hardest part of trading isn't predicting the market. It's …",
    placeholder: "Finish the sentence in your own words",
  },
  {
    id: "q46_would_miss", code: "Q46", type: "single",
    label: "Imagine that tomorrow you could never trade again. What would you miss MOST?",
    options: [
      "The income",
      "The intellectual challenge",
      "The excitement",
      "The independence",
      "Competition / winning",
      "Being good at something difficult",
      "The identity of being a trader",
      "The community / the people",
      "Nothing — I'd happily move on",
      "Other",
    ],
  },
];

const SECTIONS: Section[] = [
  { key: "profile", title: "Who you are as a trader", questions: PROFILE },
  {
    key: "mirror",
    title: "The 60-second trading mirror",
    intro: "Imagine each situation actually happened today.",
    questions: MIRROR,
  },
  {
    key: "gpp",
    title: "How much does this sound like you?",
    intro: "There are no right answers. Rate each statement from 1 (not at all like me) to 5 (extremely like me).",
    questions: GPP,
    shuffle: true,
  },
  {
    key: "behaviour",
    title: "Trading under pressure",
    intro: "During the last 6 months, how often have you…",
    questions: BEHAVIOUR,
  },
  {
    key: "spillover",
    title: "Beyond the trade",
    intro: "After a particularly bad trading day…",
    questions: SPILLOVER,
  },
  { key: "change", title: "Has trading changed you?", questions: CHANGE },
  {
    key: "personality",
    title: "About you in general",
    intro:
      "Describe yourself as you generally are now, not as you wish to be in the future. Rate how accurately each statement describes you, from 1 (very inaccurate) to 5 (very accurate).",
    questions: PERSONALITY,
  },
  { key: "closing", title: "Three last questions", questions: CLOSING },
];

export const traderPsychology: Survey = {
  slug: "tradingpsych",
  title: "The Trader Beyond the Trade",
  intro:
    "What happens inside your head when money, uncertainty and ego collide? This study looks at the psychological patterns behind trading decisions — and whether they follow you beyond the trade. About 8–10 minutes.",
  footer:
    "Responses are anonymous and will be used only for research. No identifying information is collected, and no question asks for account details or position sizes.",
  csvBasename: "trader-psychology",
  screening: {
    question: SCREENING,
    disqualifyIf: ["No"],
    message:
      "Thank you for your interest. This study focuses specifically on people with real-money financial trading experience.",
  },
  sections: SECTIONS,
  questions: SECTIONS.flatMap((s) => s.questions),
};
