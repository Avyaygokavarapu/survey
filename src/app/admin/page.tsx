import type { Metadata } from "next";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";
import { SURVEY_LIST, getSurvey } from "@/lib/surveys";
import LoginForm from "./LoginForm";
import { Notice, Shell, SignOutButton } from "./ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Surveys", robots: { index: false, follow: false } };

export default async function AdminIndexPage() {
  if (!adminConfigured()) {
    return (
      <Shell>
        <Notice title="ADMIN_PASSWORD is not set">
          Set it before this page can be unlocked:
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">vercel env add ADMIN_PASSWORD</pre>
        </Notice>
      </Shell>
    );
  }

  if (!(await isAuthed())) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <LoginForm />
      </div>
    );
  }

  if (!isDbConfigured()) {
    return (
      <Shell>
        <Header />
        <Notice title="No database connected">
          Run <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel integration add neon</code>, then{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel env pull .env.local --yes</code>.
        </Notice>
      </Shell>
    );
  }

  await ensureSchema();
  const sql = getSql();
  const counts = (await sql`
    select survey, count(*)::int as n from responses group by survey
  `) as unknown as { survey: string; n: number }[];

  const bySlug = new Map(counts.map((c) => [c.survey, c.n]));
  // Rows whose slug is no longer registered still hold real data — surface them
  // rather than letting them vanish from the admin.
  const orphans = counts.filter((c) => !getSurvey(c.survey));

  return (
    <Shell>
      <Header />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SURVEY_LIST.map((s) => (
          <a
            key={s.slug}
            href={`/admin/${s.slug}`}
            className="group rounded-xl border border-black/10 p-5 transition hover:border-black/30 hover:bg-black/[.02] dark:border-white/10 dark:hover:border-white/30 dark:hover:bg-white/[.03]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-medium leading-snug text-pretty">{s.title}</h2>
              <span className="shrink-0 tabular-nums text-sm text-black/50 dark:text-white/50">{bySlug.get(s.slug) ?? 0}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-black/50 dark:text-white/50">{s.intro}</p>
            <p className="mt-3 font-mono text-[11px] text-black/40 dark:text-white/40">/{s.slug}</p>
          </a>
        ))}
      </div>

      {orphans.length > 0 && (
        <div className="mt-6">
          <Notice title="Responses from unregistered surveys">
            {orphans.map((o) => `${o.survey} (${o.n})`).join(", ")} — these slugs are in the database but not in the
            registry. Re-register them to view or export their responses.
          </Notice>
        </div>
      )}
    </Shell>
  );
}

function Header() {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Surveys</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">Pick a survey to view and export its responses.</p>
      </div>
      <SignOutButton />
    </div>
  );
}
