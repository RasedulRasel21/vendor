"use client";

import { useActionState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { sign, type SignState } from "./actions";

const initialState: SignState = {};

export function SignForm({ agreementId, defaultName }: { agreementId: string; defaultName: string }) {
  const [state, formAction, signing] = useActionState(sign.bind(null, agreementId), initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <div>
        <label htmlFor="signedName" className={labelClass}>
          Your full name
        </label>
        <input
          id="signedName"
          name="signedName"
          type="text"
          defaultValue={defaultName}
          required
          maxLength={120}
          autoComplete="name"
          className={inputClass}
          aria-invalid={errors.signedName ? true : undefined}
        />
        <p className="mt-1.5 text-sm text-zinc-500">Typing your name here counts as your signature.</p>
        {errors.signedName && <p className={errorClass}>{errors.signedName}</p>}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="agreed"
            className="mt-0.5 size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
          />
          <span>I have read these terms and I accept them.</span>
        </label>
        {errors.agreed && <p className={errorClass}>{errors.agreed}</p>}
      </div>

      <button type="submit" disabled={signing} className={primaryButtonClass}>
        {signing ? "Saving…" : "Agree and carry on"}
      </button>
    </form>
  );
}
