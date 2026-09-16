import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Packing slip · StoreVendor",
  robots: { index: false },
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

export default async function PackingSlipPage({ params }: PageProps<"/orders/[id]/packing-slip">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const order = await db.vendorOrder.findFirst({
    where: { id, vendorId: user.vendorId },
    include: { VendorOrderLine: { orderBy: { title: "asc" } } },
  });
  // The store packs its own orders, so there's no slip for the vendor to print.
  if (!order || order.shippingMode === "STORE_SHIPS") notFound();

  const address = (order.shippingAddress ?? null) as Address | null;
  const addressLines = address
    ? [
        address.name,
        address.address1,
        address.address2,
        [address.city, address.provinceCode, address.zip].filter(Boolean).join(" "),
        address.countryCode,
      ].filter(Boolean)
    : [];

  const items = order.VendorOrderLine.map((line) => ({
    ...line,
    toSend: Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity),
  }));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          back={{ href: `/orders/${order.id}`, label: order.orderName }}
          title="Packing slip"
          description="Print this and put it in the parcel."
          actions={<PrintButton />}
        />
      </div>

      <article className="card-surface mx-auto max-w-2xl p-8 text-sm text-zinc-900 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold">{user.Vendor.name}</h1>
            <p className="mt-0.5 text-zinc-500">Sold through {order.shop.replace(".myshopify.com", "")}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold">{order.orderName}</p>
            <p className="text-zinc-500">{dateFormat.format(order.placedAt)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-zinc-200 py-5 sm:grid-cols-2">
          <div>
            <h2 className="mb-1 font-semibold">Ship to</h2>
            {addressLines.length ? (
              <address className="not-italic leading-6 text-zinc-700">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {(address?.phone ?? order.customerPhone) && (
                  <span className="block">{address?.phone ?? order.customerPhone}</span>
                )}
              </address>
            ) : (
              <p className="text-zinc-600">No shipping address on this order.</p>
            )}
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Order</h2>
            <p className="leading-6 text-zinc-700">
              {order.customerName ?? "Customer"}
              <span className="block">{order.customerEmail}</span>
            </p>
          </div>
        </section>

        <table className="w-full border-collapse py-2 text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">SKU</th>
              <th className="py-2 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((line) => (
              <tr key={line.id} className="border-b border-zinc-100">
                <td className="py-2.5">
                  <span className="font-medium">{line.title}</span>
                  {line.variantTitle && <span className="block text-zinc-500">{line.variantTitle}</span>}
                  {line.refundedQuantity > 0 && (
                    <span className="block text-zinc-500">{`${line.refundedQuantity} refunded, don't send`}</span>
                  )}
                </td>
                <td className="py-2.5 text-zinc-700">{line.sku || "—"}</td>
                <td className="py-2.5 text-right tabular-nums">{line.toSend}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="pt-5 text-zinc-500">
          <p>Thanks for your order. Questions about this parcel go to the store you bought from.</p>
        </footer>
      </article>
    </div>
  );
}
