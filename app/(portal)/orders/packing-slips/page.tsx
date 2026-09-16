import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { buildSlip } from "@/lib/packing-slip";
import { requireVendorUser } from "@/lib/session";
import { BatchPrintButton, PackingSlipSheet } from "../[id]/packing-slip/packing-slip";

export const metadata: Metadata = {
  title: "Packing slips · StoreVendor",
  robots: { index: false },
};

const OPTIONS = { prices: true, skus: true, returnNote: true };

export default async function PackingSlipsPage() {
  const user = await requireVendorUser();

  const orders = await db.vendorOrder.findMany({
    where: {
      vendorId: user.vendorId,
      status: { in: ["OPEN", "PARTIAL"] },
      shippingMode: "VENDOR_SHIPS",
    },
    orderBy: { placedAt: "asc" },
    take: 50,
    include: {
      VendorOrderLine: { orderBy: { title: "asc" } },
      VendorShipment: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const slips = await Promise.all(orders.map((order) => buildSlip(order, user.Vendor.name)));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          back={{ href: "/orders", label: "Orders" }}
          title="Packing slips"
          description={
            slips.length
              ? `Every order waiting to be packed, one slip per page. Oldest first.`
              : "Nothing is waiting to be packed."
          }
          actions={slips.length ? <BatchPrintButton count={slips.length} /> : null}
        />
      </div>

      {slips.length ? (
        <div className="space-y-6">
          {slips.map((slip) => (
            <PackingSlipSheet key={slip.id} slip={slip} options={OPTIONS} compact={false} />
          ))}
        </div>
      ) : (
        <div className="card-surface px-6 py-14 text-center print:hidden">
          <p className="font-display text-lg font-semibold text-zinc-900">No parcels to pack</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
            Orders you need to ship show up here, ready to print in one go.
          </p>
        </div>
      )}
    </div>
  );
}
