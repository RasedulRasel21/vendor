import { SUBMISSION_STATUS, type SubmissionStatus } from "@/lib/product-status";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, className, dot } = SUBMISSION_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
