import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { buildSlip } from "@/lib/packing-slip";
import { requireVendorUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";
import { PackingSlipView } from "./packing-slip";

export const metadata: Metadata = {
  title: "Packing slip · StoreVendor",
  robots: { index: false },
};

export default async function PackingSlipPage({ params }: PageProps<"/orders/[id]/packing-slip">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const [order, others] = await Promise.all([
    db.vendorOrder.findFirst({
      where: { id, vendorId: user.vendorId },
      include: {
        VendorOrderLine: { orderBy: { title: "asc" } },
        VendorShipment: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    // Other orders waiting to be packed, so several can be printed in one go.
    db.vendorOrder.count({
      where: {
        vendorId: user.vendorId,
        status: { in: ["OPEN", "PARTIAL"] },
        shippingMode: "VENDOR_SHIPS",
        NOT: { id },
      },
    }),
  ]);

  // The store packs its own orders, so there's no slip for the vendor to print.
  if (!order || order.shippingMode === "STORE_SHIPS") notFound();

  const slip = await buildSlip({ ...order, shop: order.shop }, user.Vendor.name);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          back={{ href: `/orders/${order.id}`, label: order.orderName }}
          title="Packing slip"
          description="Check what's included, then print it and put it in the parcel."
          actions={
            others > 0 ? (
              <Link href="/orders/packing-slips" className={secondaryButtonClass}>
                {`Print all ${others + 1} waiting`}
              </Link>
            ) : null
          }
        />
      </div>

      <PackingSlipView slip={slip} />
    </div>
  );
}
