"use client";

import { useActionState } from "react";
import { Banknote } from "lucide-react";
import { errorClass, primaryButtonClass } from "@/lib/ui";
import { confirmCashCollected } from "../actions";

// Cash on delivery that this vendor ships themselves: the money comes to them, so the
// store can't know it arrived until they say so.
export function CashForm({ vendorOrderId, amount }: { vendorOrderId: string; amount: string }) {
  const [state, formAction, saving] = useActionState(
    async () => confirmCashCollected(vendorOrderId),
    {} as Awaited<ReturnType<typeof confirmCashCollected>>,
  );

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <Banknote className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">You collect {amount} in cash for this one</p>
            <p className="mt-1">
              Tell us once you have it. The store counts your share from there, and keeps
              back its commission and the tax out of what you owe them.
            </p>
          </div>
        </div>
        <form action={formAction}>
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : "I have the cash"}
          </button>
        </form>
      </div>
      {state?.errors?.form && <p className={errorClass}>{state.errors.form}</p>}
    </div>
  );
}
