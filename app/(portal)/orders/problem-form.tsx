"use client";

import { MessageSquare, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { ISSUE_REASONS } from "@/lib/order-issues";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { reportProblem, withdrawProblem, type IssueFormState } from "./actions";

const initialState: IssueFormState = {};

export type OrderIssue = {
  status: string;
  reason: string;
  note: string | null;
  raisedAt: string;
  reviewNote: string | null;
  closedAt: string | null;
};

export function ProblemForm({ vendorOrderId }: { vendorOrderId: string }) {
  const [state, formAction, pending] = useActionState(reportProblem.bind(null, vendorOrderId), initialState);
  const [open, setOpen] = useState(false);
  const errors = state.errors ?? {};

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

// Stays on the order after the store closes it, so the vendor can see what was done.
export function IssueBanner({ vendorOrderId, issue }: { vendorOrderId: string; issue: OrderIssue }) {
  const [state, formAction, pending] = useActionState(
    async () => withdrawProblem(vendorOrderId),
    initialState,
  );

  if (issue.status === "RESOLVED") {
    return (
      <div className="mb-6 flex gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
        <MessageSquare className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">The store dealt with this</p>
          <p className="mt-1">
            {issue.reviewNote || "They've handled it with the customer. Nothing more for you to do."}
          </p>
          <p className="mt-1 text-primary-600">
            {[
              `You told them: ${[issue.reason, issue.note].filter(Boolean).join(" — ")}`,
              issue.closedAt ? `Closed ${issue.closedAt}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <div>
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
    </div>
  );
}
