"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { requestReset, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestReset, initialState);

  if (state.sent) {
    return (
      <div className="mt-8 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
        <p className="font-medium">Check your email</p>
        <p className="mt-1">
          If {state.email} is an account here, a link to set a new password is on its way. It
          works once and runs out in an hour.
        </p>
      </div>
    );
  }

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

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full py-2.5`}>
        {pending ? "Sending…" : "Send me a link"}
      </button>
    </form>
  );
}
