export const SUBMISSION_STATUS = {
  DRAFT: { label: "Draft", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
  PENDING: { label: "Awaiting approval", className: "bg-secondary-50 text-secondary-700", dot: "bg-secondary-600" },
  APPROVED: { label: "Live", className: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  REJECTED: { label: "Changes requested", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
} as const;

export type SubmissionStatus = keyof typeof SUBMISSION_STATUS;

// Vendors can change a product until it's waiting for review or approved.
export const EDITABLE_STATUSES: SubmissionStatus[] = ["DRAFT", "REJECTED"];
