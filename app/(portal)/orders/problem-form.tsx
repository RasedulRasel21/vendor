"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { ISSUE_REASONS } from "@/lib/order-issues";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { reportProblem, withdrawProblem, type IssueFormState } from "./actions";

const initialState: IssueFormState = {};

export type OpenIssue = { reason: string; note: string | null; raisedAt: string };

export function ProblemForm({ vendorOrderId, issue }: { vendorOrderId: string; issue: OpenIssue | null }) {
  const [state, formAction, pending] = useActionState(reportProblem.bind(null, vendorOrderId), initialState);
  const [open, setOpen] = useState(false);
  const errors = state.errors ?? {};

  if (issue) return <RaisedIssue vendorOrderId={vendorOrderId} issue={issue} />;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
      >
        <TriangleAlert className="size-4" />
        I can&apos;t ship this order
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}
      <p className="text-sm text-zinc-500">
        The store cancels or refunds the order, not you. Tell them what&apos;s wrong and they&apos;ll sort it
        with the customer.
      </p>
      <div>
        <label htmlFor="issueReason" className={labelClass}>
          What&apos;s wrong
        </label>
        <select id="issueReason" name="reason" defaultValue="OUT_OF_STOCK" className={inputClass}>
          {Object.entries(ISSUE_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.reason && <p className={errorClass}>{errors.reason}</p>}
      </div>
      <div>
        <label htmlFor="issueNote" className={labelClass}>
          Anything else they should know
        </label>
        <textarea id="issueNote" name="note" rows={2} className={inputClass} />
        {errors.note && <p className={errorClass}>{errors.note}</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Sending…" : "Tell the store"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RaisedIssue({ vendorOrderId, issue }: { vendorOrderId: string; issue: OpenIssue }) {
  const [state, formAction, pending] = useActionState(
    async () => withdrawProblem(vendorOrderId),
    initialState,
  );

  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">You told the store you can&apos;t ship this</p>
      <p className="mt-1">{[issue.reason, issue.note].filter(Boolean).join(" — ")}</p>
      <p className="mt-1 text-amber-700">{`Sent ${issue.raisedAt}. They'll cancel or refund it and let you know.`}</p>
      {state.errors?.form && <p className="mt-2 text-red-800">{state.errors.form}</p>}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 text-sm font-semibold text-amber-900 underline underline-offset-4 disabled:opacity-50"
        >
          {pending ? "Withdrawing…" : "Never mind, I can ship it"}
        </button>
      </form>
    </div>
  );
}
