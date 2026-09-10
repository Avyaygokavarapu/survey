# How Families Manage Each Other's Health — survey

Branching survey + password-gated admin dashboard with CSV export.
Next.js 16 (App Router) · Neon Postgres · deployed on Vercel.

## The instrument

Everything is generated from **one file**: `src/lib/questions.ts`.
The public form, server-side validation, the admin table columns and the CSV
headers all read from it.

```
Q1 routing ─┬─ Young adult / adult child (18–30) ──→ Branch A (10 Qs)
            ├─ Caregiver for another family member ─→ Branch A
            ├─ Parent (roughly 40–65) ─────────────→ Branch B (10 Qs)
            ├─ Older adult / grandparent (65+) ────→ Branch C (8 Qs)
            └─ Other ──────────────────────────────→ (no branch)
                                                        │
                          all paths converge ──→ 4 common questions
```

The common tail is identical for everyone, so those four are comparable across
generations — including the advice-vs-scorekeeping question.

Question types: `short`, `long`, `single`, `multi`, `scale`.
Only the routing question is required; everything else is optional, so a
respondent can skip anything and still complete.

> Keep every `id` stable once responses exist — it is the JSON key the answer is
> stored under. Editing a `label` is always safe.

### Changing the survey

- **Reword a question** — edit its `label`. Nothing else to do.
- **Add a question** — add it to the relevant branch array. No migration.
- **Re-route a role** — edit `BRANCH_BY_ROLE`. A routing option with no entry
  throws at startup rather than silently mis-routing anyone.

## Routes

| Route | |
| --- | --- |
| `/` | The public survey — **this is the link you share** |
| `/api/submit` | POST, validates against the respondent's branch and stores one row |
| `/admin` | Password-gated dashboard, filterable by branch |
| `/admin/export` | Full-width CSV of every branch (same password gate) |

## Setup

```bash
vercel login
vercel link
vercel integration add neon --yes        # provisions DATABASE_URL
vercel env add ADMIN_PASSWORD            # gates /admin
vercel env pull .env.local --yes         # pull both down for local dev
npm run dev
```

Deploy: `vercel --prod`

## Data model

One row per response. Answers in a single JSONB column, so changing the
questions never needs a migration. Table is created automatically on first write.

```sql
create table responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  branch     text,            -- 'A' | 'B' | 'C' | null
  answers    jsonb not null
);
```

**A key that is absent from `answers` means the respondent was never asked it**
(they were on another branch). A key present with a `null` value means they were
asked and skipped it. That distinction is what makes your denominators honest —
"24 of 31 Branch A respondents" rather than "24 of 40 people, some of whom were
never shown the question." The admin table renders the two differently: a blank
cell for not-asked, an em dash for asked-and-skipped.

## Notes

- Responses are anonymous — no IP address, no user-agent. Nothing identifying is
  stored unless a question explicitly asks for it.
- Submissions are validated against the respondent's own branch; answers for any
  other branch are discarded server-side.
- CSV export escapes leading `=`, `+`, `-` and `@` so free-text answers cannot
  execute as formulas when the file is opened in Excel or Sheets.
- `/admin` is `noindex` and disallowed in `robots.txt`. The admin cookie stores
  an HMAC, never the password.
