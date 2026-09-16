import { Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { Pagination } from "@/components/portal/pagination";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ACTIVE_RETURN_STATUSES, ORDER_STATUS, type OrderStatus } from "@/lib/order-status";
import { requireVendorUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Orders · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const PER_PAGE = 25;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const user = await requireVendorUser();
  const { status: requested, page: requestedPage } = await searchParams;
  const status =
    typeof requested === "string" && requested in ORDER_STATUS ? (requested as OrderStatus) : undefined;
  const current = Math.max(1, Math.trunc(Number(requestedPage)) || 1);

  const where = { vendorId: user.vendorId, ...(status ? { status } : {}) };
  // Orders the vendor hasn't opened are pinned above the rest, on every page, so a new
  // order never hides on page two.
  const unopened = { status: { in: ["OPEN", "PARTIAL"] as OrderStatus[] }, vendorSeenAt: null };
  const rows = {
    orderBy: { placedAt: "desc" } as const,
    include: {
      _count: {
        select: {
          VendorOrderLine: true,
          // Only returns still in play are worth a badge in the list.
          VendorReturn: { where: { status: { in: ACTIVE_RETURN_STATUSES } } },
        },
      },
    },
  };

  const [newCount, grouped, toPack] = await Promise.all([
    db.vendorOrder.count({ where: { ...where, AND: [unopened] } }),
    db.vendorOrder.groupBy({ by: ["status"], where: { vendorId: user.vendorId }, _count: { _all: true } }),
    db.vendorOrder.count({
      where: {
        vendorId: user.vendorId,
        status: { in: ["OPEN", "PARTIAL"] },
        shippingMode: "VENDOR_SHIPS",
      },
    }),
  ]);

  const offset = (current - 1) * PER_PAGE;
  const newTake = Math.max(0, Math.min(PER_PAGE, newCount - offset));
  const pinned = newTake
    ? await db.vendorOrder.findMany({ where: { ...where, AND: [unopened] }, skip: offset, take: newTake, ...rows })
    : [];
  const rest =
    pinned.length < PER_PAGE
      ? await db.vendorOrder.findMany({
          where: { ...where, NOT: { AND: [unopened] } },
          skip: Math.max(0, offset - newCount),
          take: PER_PAGE - pinned.length,
          ...rows,
        })
      : [];
  const orders = [...pinned, ...rest];

  const isNewOrder = (order: (typeof orders)[number]) =>
    !order.vendorSeenAt && ["OPEN", "PARTIAL"].includes(order.status);

  const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const matching = status ? (counts[status] ?? 0) : total;
  const pageHref = (number: number) => {
    const params = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(number > 1 ? { page: String(number) } : {}),
    }).toString();
    return params ? `/orders?${params}` : "/orders";
  };

  const filters: { label: string; value?: OrderStatus; count: number }[] = [
    { label: "All", count: total },
    ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((value) => ({
      label: ORDER_STATUS[value].label,
      value,
      count: counts[value] ?? 0,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Your share of each order, and what you earn from it."
        actions={
          toPack > 0 ? (
            <Link href="/orders/packing-slips" className={secondaryButtonClass}>
              <Printer className="size-4" />
              {`Packing slips (${toPack})`}
            </Link>
          ) : null
        }
      />

      <div className="card-surface">
        <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-4 py-3">
          {filters.map((filter) => {
            const active = filter.value === status;
            return (
              <Link
                key={filter.label}
                href={filter.value ? `/orders?status=${filter.value}` : "/orders"}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-primary-600 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {filter.label}
                <span className={`text-xs tabular-nums ${active ? "text-primary-100" : "text-zinc-400"}`}>
                  {filter.count}
                </span>
              </Link>
            );
          })}
        </nav>

        {orders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-zinc-900">
              {status ? `No orders are ${ORDER_STATUS[status].label.toLowerCase()}` : "No orders yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              When a customer buys one of your products, the order shows up here with the address to ship to.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 text-right font-medium">You earn</th>
                  <th className="px-6 py-3 text-right font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isNew = isNewOrder(order);
                  return (
                  <tr
                    key={order.id}
                    className={`group border-t border-zinc-100 transition ${
                      isNew ? "bg-primary-50 hover:bg-primary-100" : "hover:bg-zinc-50"
                    }`}
                  >
                    <td className="px-6 py-3">
                      <Link href={`/orders/${order.id}`} className="font-medium text-zinc-900 group-hover:underline">
                        {order.orderName}
                      </Link>
                      <span className="block text-xs text-zinc-500">
                        {order._count.VendorOrderLine} {order._count.VendorOrderLine === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isNew && (
                          <span className="inline-flex items-center rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                            New
                          </span>
                        )}
                        <OrderStatusBadge status={order.status} />
                        {order._count.VendorReturn > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Return
                          </span>
                        )}
                        {Number(order.refunded) > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Refunded
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{order.customerName ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-zinc-900">
                      {formatMoney(
                        (Number(order.earnings) - Number(order.refundedEarnings)).toFixed(2),
                        order.currencyCode,
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-500">{dateFormat.format(order.placedAt)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={{
            current,
            from: matching === 0 ? 0 : offset + 1,
            to: offset + orders.length,
            total: matching,
            hasPrevious: current > 1,
            hasNext: offset + orders.length < matching,
          }}
          href={pageHref}
        />
      </div>
    </div>
  );
}
