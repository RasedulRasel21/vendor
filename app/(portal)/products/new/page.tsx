import type { Metadata } from "next";
import Link from "next/link";
import { EMPTY_PRODUCT_FORM } from "@/lib/product-form";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Add product · StoreVendor",
};

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/products" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Add product</h1>
      <p className="mt-1 text-zinc-600">
        Save a draft anytime. When it&apos;s ready, submit it for the store to approve.
      </p>
      <div className="mt-6">
        <ProductForm submissionId={null} initialValues={EMPTY_PRODUCT_FORM} />
      </div>
    </div>
  );
}
