// Why a vendor can't ship an order. Matches app/models/order-issue.server.js in the store app.
export const ISSUE_REASONS = {
  OUT_OF_STOCK: "Out of stock",
  DAMAGED: "Item damaged",
  ADDRESS: "Problem with the address",
  DELAY: "Needs more time",
  OTHER: "Something else",
};

export function issueReasonLabel(reason: string) {
  return ISSUE_REASONS[reason as keyof typeof ISSUE_REASONS] ?? "Something else";
}
