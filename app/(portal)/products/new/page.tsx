import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { emptyDraft } from "@/lib/product-draft";
import { requireVendorUser } from "@/lib/session";
import { ProductEditor } from "../product-editor";

export const metadata: Metadata = {
  title: "Add product · StoreVendor",
};

export default async function NewProductPage() {
  const user = await requireVendorUser();
  const [settings, collections] = await Promise.all([
    db.shopSettings.findUnique({ where: { shop: user.Vendor.shop }, select: { currencyCode: true } }),
    db.shopCollection.findMany({
      where: { shop: user.Vendor.shop },
      orderBy: { title: "asc" },
      select: { collectionId: true, title: true, imageUrl: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title="Add product"
        description="Save a draft anytime. Submit it when it's ready for the store to review."
      />
      <ProductEditor
        submissionId={null}
        initialDraft={emptyDraft()}
        shopDomain={user.Vendor.shop}
        vendorId={user.vendorId}
        currencyCode={settings?.currencyCode ?? "USD"}
        collections={collections}
      />
    </div>
  );
}
