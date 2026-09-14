"use client";

import { useActionState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { acceptInvite, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = {};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={errorClass}>
      {message}
    </p>
  );
}

export function AcceptInviteForm({
  token,
  email,
  defaultName,
}: {
  token: string;
  email: string;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(acceptInvite.bind(null, token), initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="username"
          readOnly
          className={`${inputClass} bg-zinc-100 py-2.5 text-zinc-600`}
        />
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultName}
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={`${inputClass} py-2.5`}
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : "password-hint"}
          className={`${inputClass} py-2.5`}
        />
        {errors.password ? (
          <FieldError id="password-error" message={errors.password} />
        ) : (
          <p id="password-hint" className="mt-1.5 text-sm text-zinc-500">
            At least 10 characters, with a letter and a number.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
          className={`${inputClass} py-2.5`}
        />
        <FieldError id="confirm-error" message={errors.confirmPassword} />
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full py-2.5`}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}
