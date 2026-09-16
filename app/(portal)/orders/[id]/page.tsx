import { CircleCheck, Printer, RotateCcw, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/editor/card";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { ProductThumb } from "@/components/portal/product-thumb";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireVendorUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";
import { ShipForm, type ShippableLine } from "../ship-form";

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

type ShipmentItem = { lineId: string; title: string; quantity: number };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const order = await db.vendorOrder.findFirst({
    where: { id, vendorId: user.vendorId },
    include: {
      VendorOrderLine: { orderBy: { title: "asc" } },
      VendorShipment: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const currency = order.currencyCode;
  const storeShips = order.shippingMode === "STORE_SHIPS";
  const isRefunded = Number(order.refunded) > 0;
  const payable = Number(order.earnings) - Number(order.refundedEarnings);

  // Refunded items don't need sending, and neither do items already in a parcel.
  const shippableLines: ShippableLine[] = order.VendorOrderLine.map((line) => ({
    id: line.id,
    title: line.title,
    variantTitle: line.variantTitle,
    remaining: Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity),
  })).filter((line) => line.remaining > 0);

  const canShip = !storeShips && ["OPEN", "PARTIAL"].includes(order.status) && shippableLines.length > 0;

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
        actions={
          storeShips ? null : (
            <Link href={`/orders/${order.id}/packing-slip`} className={secondaryButtonClass}>
              <Printer className="size-4" />
              Packing slip
            </Link>
          )
        }
      />

      {isRefunded && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <RotateCcw className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {`The store refunded ${formatMoney(order.refunded.toFixed(2), currency)} of this order`}
            </p>
            <p className="mt-1">
              {`Your earnings drop by ${formatMoney(order.refundedEarnings.toFixed(2), currency)}, and the store's commission on the refunded items comes off too. Refunded items don't need sending.`}
            </p>
          </div>
        </div>
      )}

      {order.status === "FULFILLED" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          <CircleCheck className="size-4 shrink-0" />
          {order.fulfilledAt
            ? `Everything was sent on ${dateFormat.format(order.fulfilledAt)}. The customer has been emailed.`
            : "Everything was sent. The customer has been emailed."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title={storeShips ? "Items in this order" : "Items to ship"}>
            <ul className="divide-y divide-zinc-100">
              {order.VendorOrderLine.map((line) => {
                const remaining = Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity);
                const notes = [
                  line.shippedQuantity ? `${line.shippedQuantity} sent` : null,
                  line.refundedQuantity ? `${line.refundedQuantity} refunded` : null,
                  !storeShips && remaining && line.shippedQuantity ? `${remaining} left` : null,
                ].filter(Boolean);

                return (
                  <li key={line.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <ProductThumb src={line.imageUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900">{line.title}</p>
                      <p className="text-sm text-zinc-500">
                        {[line.variantTitle, line.sku ? `SKU ${line.sku}` : null, ...notes]
                          .filter(Boolean)
                          .join(" · ") || "No variant"}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-zinc-600">{`× ${line.quantity}`}</span>
                    <span className="w-24 text-right text-sm font-medium tabular-nums text-zinc-900">
                      {formatMoney(line.earnings.toFixed(2), currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {canShip && (
            <Card
              title={order.status === "PARTIAL" ? "Send the rest" : "Ship this order"}
              description="Add the courier and tracking, then mark it shipped."
            >
              <ShipForm vendorOrderId={order.id} lines={shippableLines} />
            </Card>
          )}

          {storeShips && order.status !== "FULFILLED" && (
            <Card title="The store ships this order">
              <p className="text-sm text-zinc-600">
                You send your stock to the store and they pack and post it. Nothing to do here; your
                earnings are counted either way.
              </p>
            </Card>
          )}

          {order.VendorShipment.length > 0 && (
            <Card title="Parcels sent">
              <ul className="divide-y divide-zinc-100">
                {order.VendorShipment.map((shipment) => {
                  const items = (shipment.items ?? []) as ShipmentItem[];
                  const tracking = [shipment.trackingCompany, shipment.trackingNumber].filter(Boolean).join(" · ");
                  return (
                    <li key={shipment.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <Truck className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {items.map((item) => `${item.quantity} × ${item.title}`).join(", ") || "Items sent"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {[
                            shipment.shippedBy === "store" ? "Sent by the store" : "Sent by you",
                            dateFormat.format(shipment.createdAt),
                            tracking || "No tracking",
                          ].join(" · ")}
                        </p>
                      </div>
                      {shipment.trackingUrl && (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-sm font-semibold text-primary-700 underline-offset-4 hover:underline"
                        >
                          Track
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
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
              {isRefunded && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Refunded to customer</dt>
                  <dd className="tabular-nums text-zinc-900">
                    {`− ${formatMoney(order.refundedEarnings.toFixed(2), currency)}`}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 font-semibold">
                <dt className="text-zinc-900">You earn</dt>
                <dd className="tabular-nums text-zinc-900">{formatMoney(payable.toFixed(2), currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-zinc-500">
              {isRefunded
                ? "Refunded items are taken off your earnings, and the store's commission on them comes off too."
                : "Paid out by the store after their payout schedule."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
