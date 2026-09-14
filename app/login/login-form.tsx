"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={state.email}
          autoComplete="username"
          required
          className={`${inputClass} py-2.5`}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${inputClass} py-2.5`}
        />
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full py-2.5`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
