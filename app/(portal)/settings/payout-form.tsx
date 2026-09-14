"use client";

import { useActionState, useState } from "react";
import { PAYOUT_METHODS } from "@/lib/payout";
import { errorClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { requestPayoutChange, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

function Field({
  name,
  label,
  error,
  help,
  inputMode,
}: {
  name: string;
  label: string;
  error?: string;
  help?: string;
  inputMode?: "numeric" | "tel" | "text";
}) {
  return (
    <div>
      <label htmlFor={`payout-${name}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`payout-${name}`}
        name={name}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={inputClass}
      />
      {error ? <p className={errorClass}>{error}</p> : help && <p className="mt-1 text-xs text-zinc-500">{help}</p>}
    </div>
  );
}

// Starts closed, so vendors don't retype payout details by accident.
export function PayoutForm({ hasPayout, hasPendingRequest }: { hasPayout: boolean; hasPendingRequest: boolean }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>("BANK");
  const [state, formAction, pending] = useActionState(requestPayoutChange, initialState);
  const errors = state.errors ?? {};

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
        {hasPendingRequest ? "Replace pending request" : hasPayout ? "Request a change" : "Add payout details"}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 p-4">
      {errors.form && <p className={errorClass}>{errors.form}</p>}

      <fieldset>
        <legend className={labelClass}>Payout method</legend>
        <div className="flex flex-wrap gap-2">
          {PAYOUT_METHODS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium ${
                method === option.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.method && <p className={errorClass}>{errors.method}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="accountName" label="Account holder name" error={errors.accountName} />
        {method === "BANK" ? (
          <Field name="accountNumber" label="Account number" inputMode="numeric" error={errors.accountNumber} />
        ) : (
          <Field
            name="accountNumber"
            label="Wallet number"
            inputMode="tel"
            error={errors.accountNumber}
            help="The 11-digit number registered with the wallet."
          />
        )}
        {method === "BANK" && (
          <>
            <Field name="bankName" label="Bank name" error={errors.bankName} />
            <Field name="branchName" label="Branch name" error={errors.branchName} />
            <Field
              name="routingNumber"
              label="Routing number (optional)"
              inputMode="numeric"
              error={errors.routingNumber}
              help="9 digits, printed on your cheque book."
            />
          </>
        )}
      </div>

      <p className="text-sm text-zinc-600">
        The store checks every payout change before it&apos;s used, and may contact you to confirm it.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send for approval"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
