import type { Metadata } from "next";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { ensureSchema, getSql, isDbConfigured, type ResponseRow } from "@/lib/db";
import { BRANCHES, ROLE_ID, columnsForBranch, type BranchId } from "@/lib/questions";
import LoginForm from "./LoginForm";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Responses", robots: { index: false, follow: false } };

const BRANCH_IDS: BranchId[] = ["A", "B", "C"];

function display(answers: Record<string, unknown>, id: string) {
  if (!(id in answers)) return { text: "", asked: false }; // not asked — wrong branch
  const v = answers[id];
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
    return { text: "—", asked: true }; // asked, left blank
  }
  return { text: Array.isArray(v) ? v.join(", ") : String(v), asked: true };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
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
        <div className="mb-5 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Responses</h1>
          <SignOutButton />
        </div>
        <Notice title="No database connected">
          Run <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel integration add neon</code>, then{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">vercel env pull .env.local --yes</code>.
        </Notice>
      </Shell>
    );
  }

  const sp = await searchParams;
  const filter: BranchId | "all" = BRANCH_IDS.includes(sp.branch as BranchId) ? (sp.branch as BranchId) : "all";

  await ensureSchema();
  const sql = getSql();
  const all = (await sql`
    select id, created_at, branch, answers from responses order by created_at desc limit 2000
  `) as unknown as ResponseRow[];

  const counts: Record<string, number> = { all: all.length };
  for (const b of BRANCH_IDS) counts[b] = all.filter((r) => r.branch === b).length;
  const noBranch = all.filter((r) => !r.branch).length;

  const rows = filter === "all" ? all : all.filter((r) => r.branch === filter);
  const columns = columnsForBranch(filter);

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Responses</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            {all.length} total
            {all.length > 0 && (
              <>
                {" · "}A {counts.A} · B {counts.B} · C {counts.C}
                {noBranch > 0 && ` · no branch ${noBranch}`}
              </>
            )}
            {all.length === 2000 && " (showing the 2000 most recent)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/export" className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black">
            Download CSV
          </a>
          <SignOutButton />
        </div>
      </div>

      <nav className="mb-5 flex flex-wrap gap-2">
        <Tab href="/admin" active={filter === "all"} label={`All · ${counts.all}`} />
        {BRANCH_IDS.map((b) => (
          <Tab key={b} href={`/admin?branch=${b}`} active={filter === b} label={`${b} — ${BRANCHES[b].title} · ${counts[b]}`} />
        ))}
      </nav>

      <p className="mb-4 text-xs text-black/45 dark:text-white/45">
        {filter === "all"
          ? "Showing the routing question and the four common questions. Pick a branch to see its own questions."
          : `Showing branch ${filter}'s questions. `}
        A blank cell means the question was not asked; “—” means it was asked and left blank. The CSV export always contains every column.
      </p>

      {rows.length === 0 ? (
        <Notice title={filter === "all" ? "No responses yet" : `No responses in branch ${filter} yet`}>
          {filter === "all" ? "Share the survey link and they will appear here." : "Try another branch."}
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
                        className={`max-w-[22rem] px-3 py-2.5 break-words whitespace-pre-wrap ${asked ? "" : "bg-black/[.02] dark:bg-white/[.02]"} ${c.q.id === ROLE_ID ? "font-medium" : ""}`}
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

function SignOutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]">
        Sign out
      </button>
    </form>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-black/15 hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
      }`}
    >
      {label}
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-dvh w-full max-w-[110rem] px-5 py-10">{children}</main>;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium">{title}</p>
      <div className="mt-1 opacity-90">{children}</div>
    </div>
  );
}
