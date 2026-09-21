"use client";

import { Wallet } from "lucide-react";
import { useActionState } from "react";
import { primaryButtonClass } from "@/lib/ui";
import { requestPayout, type PayoutRequestState } from "./actions";

const initialState: PayoutRequestState = {};

export function RequestButton({ label }: { label: string }) {
  const [state, formAction, pending] = useActionState(async () => requestPayout(), initialState);

  if (state.ok) {
    return <p className="text-sm font-medium text-primary-700">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      {state.error && <p className="mb-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        <Wallet className="size-4" />
        {pending ? "Asking…" : label}
      </button>
    </form>
  );
}
