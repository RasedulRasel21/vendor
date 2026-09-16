export const ORDER_STATUS = {
  OPEN: { label: "To ship", className: "bg-secondary-50 text-secondary-700", dot: "bg-secondary-600" },
  PARTIAL: { label: "Partly sent", className: "bg-tertiary-100 text-tertiary-600", dot: "bg-tertiary-500" },
  FULFILLED: { label: "Shipped", className: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
  CANCELLED: { label: "Cancelled", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;
