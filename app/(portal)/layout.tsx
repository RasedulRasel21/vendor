import { PortalShell } from "@/components/portal/portal-shell";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVendorUser();
  const [productsNeedingChanges, newOrders] = await Promise.all([
    db.productSubmission.count({ where: { vendorId: user.vendorId, status: "REJECTED" } }),
    // Orders the vendor hasn't opened yet, whoever ships them: the count drops as they read.
    db.vendorOrder.count({
      where: { vendorId: user.vendorId, status: { in: ["OPEN", "PARTIAL"] }, vendorSeenAt: null },
    }),
  ]);

  return (
    <PortalShell
      storeName={user.Vendor.name}
      userName={user.name ?? user.email}
      userEmail={user.email}
      productsNeedingChanges={productsNeedingChanges}
      newOrders={newOrders}
    >
      {children}
    </PortalShell>
  );
}
