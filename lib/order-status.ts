export const ORDER_STATUS = {
  OPEN: { label: "To ship", className: "bg-secondary-50 text-secondary-700", dot: "bg-secondary-600" },
  PARTIAL: { label: "Partly sent", className: "bg-tertiary-100 text-tertiary-600", dot: "bg-tertiary-500" },
  FULFILLED: { label: "Shipped", className: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  REFUNDED: { label: "Refunded", className: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  CANCELLED: { label: "Cancelled", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

// Return states come straight from Shopify. Only a requested or approved return still needs
// the vendor's attention; the rest are history.
export const RETURN_STATUS: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: "Return requested", className: "bg-amber-50 text-amber-800" },
  OPEN: { label: "Return approved", className: "bg-tertiary-100 text-tertiary-600" },
  DECLINED: { label: "Return declined", className: "bg-zinc-100 text-zinc-600" },
  CANCELED: { label: "Return cancelled", className: "bg-zinc-100 text-zinc-600" },
  CLOSED: { label: "Return finished", className: "bg-primary-50 text-primary-700" },
};

export const ACTIVE_RETURN_STATUSES = ["REQUESTED", "OPEN"];
