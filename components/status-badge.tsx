import { SUBMISSION_STATUS, type SubmissionStatus } from "@/lib/product-status";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, className } = SUBMISSION_STATUS[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
