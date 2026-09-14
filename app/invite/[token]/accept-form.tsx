"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 read-only:bg-zinc-100 read-only:text-zinc-500";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
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
  const [state, formAction, pending] = useActionState(
    acceptInvite.bind(null, token),
    initialState,
  );
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-zinc-800">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="username"
          readOnly
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="name" className="text-sm font-medium text-zinc-800">
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
          className={inputClass}
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-zinc-800">
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
          className={inputClass}
        />
        {errors.password ? (
          <FieldError id="password-error" message={errors.password} />
        ) : (
          <p id="password-hint" className="mt-1 text-sm text-zinc-500">
            At least 10 characters, with a letter and a number.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-800">
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
          className={inputClass}
        />
        <FieldError id="confirm-error" message={errors.confirmPassword} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Setting up your account…" : "Create account"}
      </button>
    </form>
  );
}
