import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order-status";
import { requireVendorUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const user = await requireVendorUser();
  const { status: requested } = await searchParams;
  const status =
    typeof requested === "string" && requested in ORDER_STATUS ? (requested as OrderStatus) : undefined;

  const [orders, grouped] = await Promise.all([
    db.vendorOrder.findMany({
      where: { vendorId: user.vendorId, ...(status ? { status } : {}) },
      orderBy: { placedAt: "desc" },
      take: 100,
      include: { _count: { select: { VendorOrderLine: true } } },
    }),
    db.vendorOrder.groupBy({ by: ["status"], where: { vendorId: user.vendorId }, _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);

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
      <PageHeader title="Orders" description="Your share of each order, and what you earn from it." />

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
                {orders.map((order) => (
                  <tr key={order.id} className="group border-t border-zinc-100 transition hover:bg-zinc-50">
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
                        <OrderStatusBadge status={order.status} />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
