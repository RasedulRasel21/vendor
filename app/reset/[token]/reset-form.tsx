"use client";

import { useActionState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { setNewPassword, type ResetState } from "./actions";

const initialState: ResetState = {};

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(setNewPassword.bind(null, token), initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      {/* Here so a password manager saves the new one against the right account. */}
      <input type="email" value={email} autoComplete="username" readOnly hidden />

      <div>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={errors.password ? true : undefined}
          required
          className={`${inputClass} py-2.5`}
        />
        {errors.password ? (
          <p id="password-error" className={errorClass}>
            {errors.password}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-zinc-500">At least 10 characters, with a letter and a number.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Type it again
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
          aria-invalid={errors.confirmPassword ? true : undefined}
          required
          className={`${inputClass} py-2.5`}
        />
        {errors.confirmPassword && (
          <p id="confirm-error" className={errorClass}>
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full py-2.5`}>
        {pending ? "Saving…" : "Save and sign in"}
      </button>
    </form>
  );
}
