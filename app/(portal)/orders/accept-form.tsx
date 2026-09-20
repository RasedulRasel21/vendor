"use client";

import { CircleCheck, HandHeart } from "lucide-react";
import { useActionState } from "react";
import { primaryButtonClass } from "@/lib/ui";
import { acceptOrder, type IssueFormState } from "./actions";

const initialState: IssueFormState = {};

export function AcceptForm({ vendorOrderId, acceptedOn }: { vendorOrderId: string; acceptedOn: string | null }) {
  const [state, formAction, pending] = useActionState(async () => acceptOrder(vendorOrderId), initialState);

  if (acceptedOn || state.ok) {
    return (
      <p className="mb-5 flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-700">
        <CircleCheck className="size-4 shrink-0" />
        {acceptedOn ? `You took this on ${acceptedOn}. The store knows it's being packed.` : "Thanks — the store knows it's being packed."}
      </p>
    );
  }

  return (
    <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-sm text-zinc-700">
        Let the store know you&apos;re packing this. Until you do, it looks like nobody has picked it up.
      </p>
      {state.errors?.form && <p className="mt-2 text-sm text-red-700">{state.errors.form}</p>}
      <form action={formAction} className="mt-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          <HandHeart className="size-4" />
          {pending ? "Taking it on…" : "I'll pack this"}
        </button>
      </form>
    </div>
  );
}
