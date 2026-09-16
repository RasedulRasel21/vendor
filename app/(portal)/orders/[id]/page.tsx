import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/editor/card";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { ProductThumb } from "@/components/portal/product-thumb";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireVendorUser } from "@/lib/session";
import { ShipForm } from "../ship-form";

export const metadata: Metadata = {
  title: "Order · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

type Address = {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  zip?: string | null;
  countryCode?: string | null;
  phone?: string | null;
};

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const order = await db.vendorOrder.findFirst({
    where: { id, vendorId: user.vendorId },
    include: { VendorOrderLine: { orderBy: { title: "asc" } } },
  });
  if (!order) notFound();

  const currency = order.currencyCode;
  const storeShips = order.shippingMode === "STORE_SHIPS";
  // The buyer's address is only shown to the vendor who actually posts the parcel.
  const address = storeShips ? null : ((order.shippingAddress ?? null) as Address | null);
  const addressLines = address
    ? [
        address.name,
        address.address1,
        address.address2,
        [address.city, address.provinceCode, address.zip].filter(Boolean).join(" "),
        address.countryCode,
      ].filter(Boolean)
    : [];

  return (
    <div>
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={order.orderName}
        description={`Placed ${dateFormat.format(order.placedAt)}`}
        meta={<OrderStatusBadge status={order.status} />}
      />

      {order.status === "FULFILLED" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          <CircleCheck className="size-4 shrink-0" />
          {order.fulfilledAt
            ? `Marked shipped on ${dateFormat.format(order.fulfilledAt)}. The customer has been emailed.`
            : "Shipped. The customer has been emailed."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title={storeShips ? "Items in this order" : "Items to ship"}>
            <ul className="divide-y divide-zinc-100">
              {order.VendorOrderLine.map((line) => (
                <li key={line.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <ProductThumb src={line.imageUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">{line.title}</p>
                    <p className="text-sm text-zinc-500">
                      {[line.variantTitle, line.sku ? `SKU ${line.sku}` : null].filter(Boolean).join(" · ") ||
                        "No variant"}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-zinc-600">{`× ${line.quantity}`}</span>
                  <span className="w-24 text-right text-sm font-medium tabular-nums text-zinc-900">
                    {formatMoney(line.earnings.toFixed(2), currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {order.status === "OPEN" &&
            (storeShips ? (
              <Card title="The store ships this order">
                <p className="text-sm text-zinc-600">
                  You send your stock to the store and they pack and post it. Nothing to do here; your
                  earnings are counted either way.
                </p>
              </Card>
            ) : (
              <Card title="Ship this order" description="Add the courier and tracking, then mark it shipped.">
                <ShipForm vendorOrderId={order.id} />
              </Card>
            ))}
        </div>

        <div className="space-y-6">
          <Card title={storeShips ? "Delivery" : "Ship to"}>
            {storeShips ? (
              <p className="text-sm text-zinc-600">
                The store handles delivery for this order, so the customer&apos;s address stays with them.
              </p>
            ) : addressLines.length ? (
              <address className="not-italic text-sm leading-6 text-zinc-800">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {(address?.phone ?? order.customerPhone) && (
                  <span className="mt-2 block text-zinc-600">{address?.phone ?? order.customerPhone}</span>
                )}
              </address>
            ) : (
              <p className="text-sm text-zinc-600">
                No shipping address on this order. It may be a digital product or a pickup.
              </p>
            )}
          </Card>

          <Card title="Your earnings">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Items</dt>
                <dd className="tabular-nums text-zinc-900">{formatMoney(order.subtotal.toFixed(2), currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Store commission</dt>
                <dd className="tabular-nums text-zinc-900">
                  {`− ${formatMoney(order.commission.toFixed(2), currency)}`}
                </dd>
              </div>
              {Number(order.shipping) > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Shipping</dt>
                  <dd className="tabular-nums text-zinc-900">{formatMoney(order.shipping.toFixed(2), currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 font-semibold">
                <dt className="text-zinc-900">You earn</dt>
                <dd className="tabular-nums text-zinc-900">{formatMoney(order.earnings.toFixed(2), currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-zinc-500">Paid out by the store after their payout schedule.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
