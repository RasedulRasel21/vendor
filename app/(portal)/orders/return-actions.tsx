"use client";

import { useActionState, useState } from "react";
import { DECLINE_REASONS } from "@/lib/order-status";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { actOnReturn, type ReturnFormState } from "./actions";

const initialState: ReturnFormState = {};

export function ReturnActions({
  vendorReturnId,
  status,
  canRestock,
}: {
  vendorReturnId: string;
  status: string;
  canRestock: boolean;
}) {
  const [state, formAction, pending] = useActionState(actOnReturn.bind(null, vendorReturnId), initialState);
  const [declining, setDeclining] = useState(false);
  const errors = state.errors ?? {};

  if (state.ok) {
    return <p className="mt-2 text-sm font-medium text-primary-700">{state.message}</p>;
  }

  if (status === "REQUESTED") {
    return (
      <div className="mt-2">
        {errors.form && <p className={errorClass}>{errors.form}</p>}
        {declining ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="decline" />
            <div>
              <label htmlFor={`reason-${vendorReturnId}`} className={labelClass}>
                Why not?
              </label>
              <select id={`reason-${vendorReturnId}`} name="reason" defaultValue="OTHER" className={inputClass}>
                {Object.entries(DECLINE_REASONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`note-${vendorReturnId}`} className={labelClass}>
                What the customer will be told
              </label>
              <textarea id={`note-${vendorReturnId}`} name="note" rows={2} className={inputClass} />
              {errors.note && <p className={errorClass}>{errors.note}</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={primaryButtonClass}>
                {pending ? "Sending…" : "Turn it down"}
              </button>
              <button
                type="button"
                onClick={() => setDeclining(false)}
                disabled={pending}
                className={secondaryButtonClass}
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <form action={formAction}>
              <input type="hidden" name="intent" value="approve" />
              <button type="submit" disabled={pending} className={primaryButtonClass}>
                {pending ? "Approving…" : "Approve the return"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              disabled={pending}
              className={secondaryButtonClass}
            >
              Turn it down
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "OPEN") {
    return (
      <div className="mt-2">
        {errors.form && <p className={errorClass}>{errors.form}</p>}
        {canRestock ? (
          <form action={formAction}>
            <input type="hidden" name="intent" value="restock" />
            <button type="submit" disabled={pending} className={secondaryButtonClass}>
              {pending ? "Putting it back…" : "It's back — put it in stock"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-500">
            Once it reaches you, the store puts it back in stock. They haven&apos;t set a location for
            that yet.
          </p>
        )}
      </div>
    );
  }

  return null;
}
