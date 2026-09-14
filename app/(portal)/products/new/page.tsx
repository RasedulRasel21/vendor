import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { emptyDraft } from "@/lib/product-draft";
import { requireVendorUser } from "@/lib/session";
import { ProductEditor } from "../product-editor";

export const metadata: Metadata = {
  title: "Add product · StoreVendor",
};

export default async function NewProductPage() {
  const user = await requireVendorUser();
  const settings = await db.shopSettings.findUnique({
    where: { shop: user.Vendor.shop },
    select: { currencyCode: true },
  });

  return (
    <div>
      <Link href="/products" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Products
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold text-zinc-900">Add product</h1>
      <ProductEditor
        submissionId={null}
        initialDraft={emptyDraft()}
        shopDomain={user.Vendor.shop}
        vendorId={user.vendorId}
        currencyCode={settings?.currencyCode ?? "USD"}
      />
    </div>
  );
}
