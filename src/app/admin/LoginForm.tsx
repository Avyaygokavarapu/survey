"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-2xl border border-black/10 p-8 dark:border-white/10">
      <div>
        <h1 className="text-lg font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">Enter the admin password to view responses.</p>
      </div>
      <input
        type="password"
        name="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-white/5"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
