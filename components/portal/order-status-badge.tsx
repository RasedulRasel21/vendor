import { ORDER_STATUS, type OrderStatus } from "@/lib/order-status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className, dot } = ORDER_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
