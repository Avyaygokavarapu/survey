import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { ensureSchema, getSql, isDbConfigured, type ResponseRow } from "@/lib/db";
import { columnsForBranch, getSurvey } from "@/lib/surveys";
import LoginForm from "../LoginForm";
import { Notice, Shell, SignOutButton, Tab } from "../ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const survey = getSurvey((await params).slug);
  return { title: survey ? `Admin · ${survey.title}` : "Admin", robots: { index: false, follow: false } };
}

function display(answers: Record<string, unknown>, id: string) {
  if (!(id in answers)) return { text: "", asked: false }; // not asked — wrong branch
  const v = answers[id];
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
    return { text: "—", asked: true }; // asked, left blank
  }
  return { text: Array.isArray(v) ? v.join(", ") : String(v), asked: true };
}

export default async function AdminSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const survey = getSurvey((await params).slug);
  if (!survey) notFound();

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
        <TitleRow survey={survey} />
        <Notice title="No database connected">
          Run <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel integration add neon</code>, then{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel env pull .env.local --yes</code>.
        </Notice>
      </Shell>
    );
  }

  const branchIds = survey.routing ? Object.keys(survey.routing.branches) : [];
  const sp = await searchParams;
  const filter: string = branchIds.includes(sp.branch ?? "") ? (sp.branch as string) : "all";

  await ensureSchema();
  const sql = getSql();
  const all = (await sql`
    select id, created_at, survey, branch, answers
    from responses
    where survey = ${survey.slug}
    order by created_at desc
    limit 2000
  `) as unknown as ResponseRow[];

  const counts: Record<string, number> = { all: all.length };
  for (const b of branchIds) counts[b] = all.filter((r) => r.branch === b).length;
  const noBranch = all.filter((r) => !r.branch).length;

  const rows = filter === "all" ? all : all.filter((r) => r.branch === filter);
  const columns = columnsForBranch(survey, filter);
  const routingId = survey.routing?.question.id ?? null;

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <TitleRow survey={survey} />
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {all.length} total
            {all.length > 0 && branchIds.length > 0 && (
              <>
                {" · "}
                {branchIds.map((b) => `${b} ${counts[b]}`).join(" · ")}
                {noBranch > 0 && ` · no branch ${noBranch}`}
              </>
            )}
            {all.length === 2000 && " (showing the 2000 most recent)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/admin/${survey.slug}/export`}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
          >
            Download CSV
          </a>
          <SignOutButton />
        </div>
      </div>

      {branchIds.length > 0 && (
        <nav className="mb-5 flex flex-wrap gap-2">
          <Tab href={`/admin/${survey.slug}`} active={filter === "all"} label={`All · ${counts.all}`} />
          {branchIds.map((b) => (
            <Tab
              key={b}
              href={`/admin/${survey.slug}?branch=${b}`}
              active={filter === b}
              label={`${b} — ${survey.routing!.branches[b].title} · ${counts[b]}`}
            />
          ))}
        </nav>
      )}

      <p className="mb-4 text-xs text-black/45 dark:text-white/45">
        {branchIds.length === 0
          ? "Showing every question in this survey. "
          : filter === "all"
            ? "Showing the routing question and the questions everyone answers. Pick a branch to see its own questions. "
            : `Showing branch ${filter}'s questions. `}
        A blank cell means the question was not asked; “—” means it was asked and left blank. The CSV export always
        contains every column.
      </p>

      {rows.length === 0 ? (
        <Notice title={filter === "all" ? "No responses yet" : `No responses in branch ${filter} yet`}>
          {filter === "all" ? (
            <>
              Share <code className="rounded bg-black/5 px-1 dark:bg-white/10">/{survey.slug}</code> and they will appear
              here.
            </>
          ) : (
            "Try another branch."
          )}
        </Notice>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="sticky left-0 z-10 bg-[#f4f4f4] px-3 py-2.5 text-left font-medium dark:bg-[#1e1e1e]">#</th>
                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Submitted</th>
                {columns.map((c) => (
                  <th key={c.q.id} className="min-w-[12rem] max-w-[18rem] px-3 py-2.5 text-left align-bottom font-medium">
                    <span className="block text-[11px] leading-tight text-black/45 dark:text-white/45">
                      {c.group === "role" ? "Routing" : c.group === "common" ? "Common" : `Branch ${c.group}`}
                    </span>
                    <span className="block leading-snug">{c.header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-black/10 align-top even:bg-black/[.015] dark:border-white/10 dark:even:bg-white/[.03]">
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 tabular-nums text-black/45 dark:text-white/45">{rows.length - i}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-black/60 dark:text-white/60">{new Date(r.created_at).toLocaleString()}</td>
                  {columns.map((c) => {
                    const { text, asked } = display(r.answers ?? {}, c.q.id);
                    return (
                      <td
                        key={c.q.id}
                        className={`max-w-[22rem] px-3 py-2.5 break-words whitespace-pre-wrap ${asked ? "" : "bg-black/[.02] dark:bg-white/[.02]"} ${c.q.id === routingId ? "font-medium" : ""}`}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function TitleRow({ survey }: { survey: { slug: string; title: string } }) {
  return (
    <div>
      <Link href="/admin" className="text-xs text-black/45 hover:underline dark:text-white/45">
        ← All surveys
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pretty">{survey.title}</h1>
    </div>
  );
}
