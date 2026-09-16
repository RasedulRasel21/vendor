import { PortalShell } from "@/components/portal/portal-shell";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVendorUser();
  const [productsNeedingChanges, ordersToShip] = await Promise.all([
    db.productSubmission.count({ where: { vendorId: user.vendorId, status: "REJECTED" } }),
    db.vendorOrder.count({ where: { vendorId: user.vendorId, status: "OPEN" } }),
  ]);

  return (
    <PortalShell
      storeName={user.Vendor.name}
      userName={user.name ?? user.email}
      userEmail={user.email}
      productsNeedingChanges={productsNeedingChanges}
      ordersToShip={ordersToShip}
    >
      {children}
    </PortalShell>
  );
}
