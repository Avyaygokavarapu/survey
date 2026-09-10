/** CSV encoding for the admin export. Pure — no Next.js imports, so it is testable standalone. */
export function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  // Respondents are untrusted. Prefix a quote so Excel / Sheets treat a leading
  // =, +, -, @ or tab as literal text rather than a live formula.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(cell).join(",")];
  for (const r of rows) lines.push(r.map(cell).join(","));
  // Leading BOM so Excel opens UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}
