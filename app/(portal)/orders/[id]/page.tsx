import { CircleCheck, Clock, Printer, RotateCcw, Truck, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Card } from "@/components/editor/card";
import { OrderStatusBadge } from "@/components/portal/order-status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { ProductThumb } from "@/components/portal/product-thumb";
import { carrierOptions } from "@/lib/carriers";
import { db } from "@/lib/db";
import { vendorPermissions } from "@/lib/store-app";
import { formatMoney } from "@/lib/money";
import { shipDeadline } from "@/lib/deadline";
import { issueReasonLabel } from "@/lib/order-issues";
import { RETURN_STATUS } from "@/lib/order-status";
import { requireVendorUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";
import { AcceptForm } from "../accept-form";
import { IssueBanner, ProblemForm } from "../problem-form";
import { ReturnActions } from "../return-actions";
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

type ReturnItem = { lineId: string; title: string; quantity: number; reason: string | null; note: string | null };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const order = await db.vendorOrder.findFirst({
    where: { id, vendorId: user.vendorId },
    include: {
      VendorOrderLine: { orderBy: { title: "asc" } },
      VendorShipment: { orderBy: { createdAt: "desc" } },
      VendorReturn: { orderBy: { requestedAt: "desc" } },
      // The latest one, open or closed: a closed one still carries what the store did about it.
      VendorOrderIssue: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();

  // Opening an order counts as seeing it, which clears it from the new orders count.
  // Done after the page is sent, so it never slows the page down.
  if (!order.vendorSeenAt) {
    after(async () => {
      await db.vendorOrder.updateMany({
        where: { id: order.id, vendorId: user.vendorId, vendorSeenAt: null },
        data: { vendorSeenAt: new Date() },
      });
      // The count lives in the sidebar, so the whole layout has to be refreshed, not
      // just this page.
      revalidatePath("/", "layout");
    });
  }

  const currency = order.currencyCode;
  const storeShips = order.shippingMode === "STORE_SHIPS";
  // Some stores keep the customer's phone number to themselves; the address still comes
  // through, because the parcel has to get there.
  const { canSeeCustomerContact: canSeeContact } = await vendorPermissions(user.vendorId);
  const isRefunded = Number(order.refunded) > 0;
  const payable = Number(order.earnings) - Number(order.refundedEarnings);
  const isPickup = ["PICK_UP", "RETAIL"].includes(order.deliveryMethod ?? "");
  const nothingToPost = order.VendorOrderLine.every((line) => !line.requiresShipping);

  // Refunded items don't need sending, and neither do items already in a parcel.
  const shippableLines: ShippableLine[] = order.VendorOrderLine.map((line) => ({
    id: line.id,
    title: line.title,
    variantTitle: line.variantTitle,
    remaining: Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity),
  })).filter((line) => line.remaining > 0);

  const canShip = !storeShips && ["OPEN", "PARTIAL"].includes(order.status) && shippableLines.length > 0;
  const carriers = canShip ? await carrierOptions(user.Vendor.shop, user.vendorId) : null;

  const settings = await db.shopSettings.findUnique({
    where: { shop: user.Vendor.shop },
    select: { fulfillmentDays: true, restockLocationId: true },
  });
  // The deadline is only worth showing while something still has to go out.
  const deadline = canShip && settings ? shipDeadline(order.placedAt, settings.fulfillmentDays) : null;
  // Vendors can only put stock back once the store has said where it goes.
  const canRestock = Boolean(settings?.restockLocationId);
  const latestIssue = order.VendorOrderIssue[0] ?? null;
  const issue =
    latestIssue && ["OPEN", "RESOLVED"].includes(latestIssue.status)
      ? {
          status: latestIssue.status,
          reason: issueReasonLabel(latestIssue.reason),
          note: latestIssue.note,
          raisedAt: dateFormat.format(latestIssue.createdAt),
          reviewNote: latestIssue.reviewNote,
          closedAt: latestIssue.resolvedAt ? dateFormat.format(latestIssue.resolvedAt) : null,
        }
      : null;

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
        description={[`Placed ${dateFormat.format(order.placedAt)}`, deadline?.label].filter(Boolean).join(" · ")}
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

      {deadline?.overdue && !issue && (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {deadline.lateDays === 0
                ? "This order is due today"
                : `This order is ${deadline.lateDays} ${deadline.lateDays === 1 ? "day" : "days"} late`}
            </p>
            <p className="mt-1">
              The store expects it shipped by now. Send it today, or tell them you can&apos;t ship it so
              they can sort it out with the customer.
            </p>
          </div>
        </div>
      )}

      {issue && <IssueBanner vendorOrderId={order.id} issue={issue} />}

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

          {canShip && carriers && (
            <Card
              title={
                nothingToPost
                  ? "Mark this order done"
                  : order.status === "PARTIAL"
                    ? "Send the rest"
                    : "Ship this order"
              }
              description={
                nothingToPost
                  ? "Nothing to post here. Mark it done once the customer has what they bought."
                  : isPickup
                    ? "Hand the items to the store, then mark them done so the customer is told."
                    : `Add the courier and tracking, then mark it shipped.${
                        order.shippingMethod ? ` The customer chose ${order.shippingMethod}.` : ""
                      }`
              }
            >
              {!issue && (
                <AcceptForm
                  vendorOrderId={order.id}
                  acceptedOn={order.acceptedAt ? dateFormat.format(order.acceptedAt) : null}
                />
              )}
              <ShipForm vendorOrderId={order.id} lines={shippableLines} carriers={carriers} />
              {issue?.status !== "OPEN" && <ProblemForm vendorOrderId={order.id} />}
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

          {order.VendorReturn.length > 0 && (
            <Card
              title="Returns"
              description="Approve or turn down returns of your items. Refunds stay with the store, and refunded items come off your earnings."
            >
              <ul className="divide-y divide-zinc-100">
                {order.VendorReturn.map((vendorReturn) => {
                  const badge = RETURN_STATUS[vendorReturn.status];
                  const items = (vendorReturn.items ?? []) as ReturnItem[];
                  return (
                    <li key={vendorReturn.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                        <Undo2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900">{vendorReturn.name ?? "Return"}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              badge?.className ?? "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {badge?.label ?? "Return"}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">
                          {items
                            .map((item) =>
                              [`${item.quantity} × ${item.title}`, item.reason, item.note]
                                .filter(Boolean)
                                .join(" · "),
                            )
                            .join("; ")}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {`Asked for ${dateFormat.format(vendorReturn.requestedAt)}`}
                        </p>
                        <ReturnActions
                          vendorReturnId={vendorReturn.id}
                          status={vendorReturn.status}
                          canRestock={canRestock}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
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
          <Card title={storeShips ? "Delivery" : isPickup ? "Collection" : "Ship to"}>
            {isPickup && !storeShips ? (
              <p className="text-sm text-zinc-600">
                The customer collects this order from the store. Hand the items over to the store rather than
                posting them.
              </p>
            ) : storeShips ? (
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
                {canSeeContact && (address?.phone ?? order.customerPhone) && (
                  <span className="mt-2 block text-zinc-600">{address?.phone ?? order.customerPhone}</span>
                )}
                {!canSeeContact && (
                  <span className="mt-2 block text-zinc-500">
                    The store keeps the customer&apos;s phone number. Anything you need to ask them, ask the
                    store.
                  </span>
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
            {order.presentmentCurrency && order.presentmentSubtotal && (
              <p className="mt-1 text-sm text-zinc-500">
                {`The customer paid ${formatMoney(order.presentmentSubtotal.toFixed(2), order.presentmentCurrency)} for these items; you're paid in ${currency}.`}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
