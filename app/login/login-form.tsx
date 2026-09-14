"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-zinc-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={state.email}
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-zinc-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
