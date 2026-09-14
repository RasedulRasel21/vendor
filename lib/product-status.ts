export const SUBMISSION_STATUS = {
  DRAFT: { label: "Draft", className: "bg-zinc-100 text-zinc-700" },
  PENDING: { label: "Awaiting approval", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "Changes requested", className: "bg-red-100 text-red-800" },
} as const;

export type SubmissionStatus = keyof typeof SUBMISSION_STATUS;

// Vendors can change a product until it's waiting for review or approved.
export const EDITABLE_STATUSES: SubmissionStatus[] = ["DRAFT", "REJECTED"];
