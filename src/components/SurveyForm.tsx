"use client";

import { useMemo, useState } from "react";
import { branchFor, type Question, type Survey } from "@/lib/surveys";

type Value = string | string[] | number | null;

function blank(q: Question): Value {
  return q.type === "multi" ? [] : q.type === "scale" ? null : "";
}

export default function SurveyForm({ survey }: { survey: Survey }) {
  // A flat survey (no routing question) is simply one step of everything.
  const routingId = survey.routing?.question.id ?? null;
  const [values, setValues] = useState<Record<string, Value>>(routingId ? { [routingId]: "" } : {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const role = routingId ? (values[routingId] as string) || "" : "";
  const branch = branchFor(survey, role);
  const branchQuestions = useMemo(
    () => (branch && survey.routing ? survey.routing.branches[branch].questions : []),
    [branch, survey],
  );

  // Steps: 0 = routing, 1 = branch (only if there is one), 2 = common tail.
  const steps = useMemo(() => {
    if (!survey.routing) {
      return [{ key: "all", title: survey.tailTitle ?? "Questions", questions: survey.questions }];
    }
    return [
      { key: "role", title: "About you", questions: [survey.routing.question] },
      ...(branch ? [{ key: "branch", title: survey.routing.branches[branch].title, questions: branchQuestions }] : []),
      { key: "common", title: survey.tailTitle ?? "A few questions for everyone", questions: survey.questions },
    ];
  }, [survey, branch, branchQuestions]);

  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

  function set(id: string, v: Value) {
    setValues((prev) => {
      const next = { ...prev, [id]: v };
      // Changing the role sends the respondent down a different branch — drop
      // answers from the branch they are leaving so they are never submitted.
      if (routingId && id === routingId && prev[routingId] !== v) {
        const leaving = branchFor(survey, prev[routingId] as string);
        if (leaving && survey.routing) for (const q of survey.routing.branches[leaving].questions) delete next[q.id];
      }
      return next;
    });
    setErrors((prev) => (prev[id] ? { ...prev, [id]: "" } : prev));
  }

  function toggle(id: string, option: string) {
    setValues((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return { ...prev, [id]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] };
    });
    setErrors((prev) => (prev[id] ? { ...prev, [id]: "" } : prev));
  }

  function next() {
    const missing: Record<string, string> = {};
    for (const q of current.questions) {
      if (!q.required) continue;
      const v = values[q.id];
      const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) missing[q.id] = "This question is required.";
    }
    if (Object.keys(missing).length) {
      setErrors(missing);
      document.getElementById(`q-${Object.keys(missing)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setStatus("sending");
    setErrors({});
    setMessage("");

    // Send only what this respondent was actually asked.
    const payload: Record<string, Value> = {};
    if (routingId) payload[routingId] = role;
    for (const q of [...branchQuestions, ...survey.questions]) payload[q.id] = values[q.id] ?? blank(q);

    try {
      const res = await fetch(`/api/submit/${survey.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        window.scrollTo({ top: 0 });
        return;
      }
      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        setStatus("idle");
        const firstId = Object.keys(data.errors)[0];
        const onThisStep = current.questions.some((q) => q.id === firstId);
        if (!onThisStep) setStep(0);
        setTimeout(() => document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        return;
      }
      setStatus("error");
      setMessage(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
        <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Thank you</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-emerald-800/80 dark:text-emerald-200/70">
          Your response has been recorded. It will be used only for research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{survey.title}</h1>
        <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">{survey.intro}</p>
      </header>

      <div className="space-y-2">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-black dark:bg-white" : "bg-black/12 dark:bg-white/15"}`}
            />
          ))}
        </div>
        <p className="text-xs font-medium tracking-wide text-black/45 uppercase dark:text-white/45">
          Step {step + 1} of {steps.length} · {current.title}
        </p>
      </div>

      <div className="space-y-8">
        {current.questions.map((q, i) => (
          <fieldset key={q.id} id={`q-${q.id}`} className="space-y-3">
            <legend className="text-base leading-snug font-medium text-pretty">
              <span className="mr-2 text-black/35 tabular-nums dark:text-white/35">{i + 1}.</span>
              {q.label}
              {q.required && <span className="ml-1 text-red-600" aria-hidden>*</span>}
            </legend>
            {q.help && <p className="text-xs text-black/50 dark:text-white/50">{q.help}</p>}
            <Field q={q} value={values[q.id] ?? blank(q)} set={set} toggle={toggle} />
            {errors[q.id] && <p className="text-sm text-red-600 dark:text-red-400">{errors[q.id]}</p>}
          </fieldset>
        ))}
      </div>

      {status === "error" && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm transition hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={isLast ? submit : next}
          disabled={status === "sending"}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "sending" ? "Submitting…" : isLast ? "Submit" : "Continue"}
        </button>
        <span className="ml-auto text-xs text-black/40 dark:text-white/40">
          {step === 0 ? <><span className="text-red-600">*</span> required</> : "All questions optional"}
        </span>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-white/5 dark:focus:border-white/40 dark:focus:ring-white/10";

const choiceCls =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 px-3.5 py-2.5 text-sm leading-snug transition hover:bg-black/[.03] has-checked:border-black/40 has-checked:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04] dark:has-checked:border-white/40 dark:has-checked:bg-white/[.06]";

function Field({
  q,
  value,
  set,
  toggle,
}: {
  q: Question;
  value: Value;
  set: (id: string, v: Value) => void;
  toggle: (id: string, option: string) => void;
}) {
  if (q.type === "short")
    return <input type="text" className={inputCls} placeholder={q.placeholder} value={(value as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />;

  if (q.type === "long")
    return <textarea rows={4} className={inputCls} placeholder={q.placeholder ?? "Type your answer here…"} value={(value as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />;

  if (q.type === "single")
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <label key={o} className={choiceCls}>
            <input type="radio" name={q.id} value={o} checked={value === o} onChange={() => set(q.id, o)} className="mt-0.5 h-4 w-4 shrink-0 accent-black dark:accent-white" />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );

  if (q.type === "multi") {
    const cur = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <label key={o} className={choiceCls}>
            <input type="checkbox" name={q.id} value={o} checked={cur.includes(o)} onChange={() => toggle(q.id, o)} className="mt-0.5 h-4 w-4 shrink-0 accent-black dark:accent-white" />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );
  }

  const steps = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {steps.map((n) => (
          <label
            key={n}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-black/15 text-sm tabular-nums transition hover:bg-black/[.03] has-checked:border-black has-checked:bg-black has-checked:text-white dark:border-white/15 dark:hover:bg-white/[.05] dark:has-checked:border-white dark:has-checked:bg-white dark:has-checked:text-black"
          >
            <input type="radio" name={q.id} value={n} checked={value === n} onChange={() => set(q.id, n)} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
      {(q.minLabel || q.maxLabel) && (
        <div className="mt-2 flex justify-between text-xs text-black/45 dark:text-white/45">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
      )}
    </div>
  );
}
