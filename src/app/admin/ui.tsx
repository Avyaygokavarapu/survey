import { logout } from "./actions";

export function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-dvh w-full max-w-[110rem] px-5 py-10">{children}</main>;
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium">{title}</p>
      <div className="mt-1 opacity-90">{children}</div>
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]">
        Sign out
      </button>
    </form>
  );
}

export function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
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
