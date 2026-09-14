import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { ProductFormValues } from "@/lib/product-form";
import { StatusBadge } from "@/components/status-badge";
import { EDITABLE_STATUSES } from "@/lib/product-status";
import { requireVendorUser } from "@/lib/session";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Product · StoreVendor",
};

const SAVED_MESSAGES: Record<string, string> = {
  draft: "Draft saved.",
  submitted: "Submitted for approval. The store will review it soon.",
};

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[id]">) {
  const user = await requireVendorUser();
  const { id } = await params;
  const { saved } = await searchParams;

  const submission = await db.productSubmission.findFirst({
    where: { id, vendorId: user.vendorId },
  });
  if (!submission) notFound();

  const editable = EDITABLE_STATUSES.includes(submission.status);
  const savedMessage = typeof saved === "string" ? SAVED_MESSAGES[saved] : undefined;

  const values: ProductFormValues = {
    title: submission.title,
    description: submission.description ?? "",
    productType: submission.productType ?? "",
    tags: submission.tags.join(", "),
    price: submission.price?.toFixed(2) ?? "",
    compareAtPrice: submission.compareAtPrice?.toFixed(2) ?? "",
    sku: submission.sku ?? "",
    barcode: submission.barcode ?? "",
    inventoryQuantity: submission.inventoryQuantity?.toString() ?? "",
    imageUrls: submission.imageUrls.join("\n"),
  };

  return (
    <div className="max-w-3xl">
      <Link href="/products" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Products
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">{submission.title}</h1>
        <StatusBadge status={submission.status} />
      </div>

      {savedMessage && (
        <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {savedMessage}
        </p>
      )}

      {submission.status === "REJECTED" && submission.reviewNote && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">The store asked for changes</p>
          <p className="mt-1">{submission.reviewNote}</p>
        </div>
      )}

      <div className="mt-6">
        {editable ? (
          <ProductForm submissionId={submission.id} initialValues={values} />
        ) : (
          <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm">
            <p className="text-zinc-600">
              {submission.status === "PENDING"
                ? "This product is waiting for the store to review it, so it can't be edited right now."
                : "This product is approved and live in the store."}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="text-zinc-500">Price</dt>
              <dd className="tabular-nums text-zinc-900">{values.price || "—"}</dd>
              <dt className="text-zinc-500">Compare-at price</dt>
              <dd className="tabular-nums text-zinc-900">{values.compareAtPrice || "—"}</dd>
              <dt className="text-zinc-500">SKU</dt>
              <dd className="text-zinc-900">{values.sku || "—"}</dd>
              <dt className="text-zinc-500">Quantity</dt>
              <dd className="tabular-nums text-zinc-900">{values.inventoryQuantity || "—"}</dd>
              <dt className="text-zinc-500">Images</dt>
              <dd className="text-zinc-900">{submission.imageUrls.length}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
