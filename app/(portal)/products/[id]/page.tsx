import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { draftFromSubmission, variantLabel } from "@/lib/product-draft";
import { EDITABLE_STATUSES } from "@/lib/product-status";
import { requireVendorUser } from "@/lib/session";
import { ProductEditor } from "../product-editor";

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

  const [submission, settings] = await Promise.all([
    db.productSubmission.findFirst({ where: { id, vendorId: user.vendorId } }),
    db.shopSettings.findUnique({ where: { shop: user.Vendor.shop }, select: { currencyCode: true } }),
  ]);
  if (!submission) notFound();

  const draft = draftFromSubmission(submission);
  const editable = EDITABLE_STATUSES.includes(submission.status);
  const savedMessage = typeof saved === "string" ? SAVED_MESSAGES[saved] : undefined;

  return (
    <div>
      <Link href="/products" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Products
      </Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">{submission.title}</h1>
        <StatusBadge status={submission.status} />
      </div>

      {savedMessage && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {savedMessage}
        </p>
      )}

      {submission.status === "REJECTED" && submission.reviewNote && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">The store asked for changes</p>
          <p className="mt-1 whitespace-pre-line">{submission.reviewNote}</p>
        </div>
      )}

      {editable ? (
        <ProductEditor
          submissionId={submission.id}
          initialDraft={draft}
          shopDomain={user.Vendor.shop}
          vendorId={user.vendorId}
          currencyCode={settings?.currencyCode ?? "USD"}
        />
      ) : (
        <div className="max-w-3xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm">
          <p className="text-zinc-600">
            {submission.status === "PENDING"
              ? "This product is waiting for the store to review it, so it can't be edited right now."
              : "This product is approved and live in the store."}
          </p>
          <table className="w-full text-left">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2 font-medium">Variant</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">SKU</th>
                <th className="py-2 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {draft.variants.map((variant) => {
                const label = variantLabel(variant.optionValues, draft.options) || "Default";
                return (
                  <tr key={label} className="border-t border-zinc-100">
                    <td className="py-2 text-zinc-900">{label}</td>
                    <td className="py-2 tabular-nums text-zinc-900">{variant.price || "—"}</td>
                    <td className="py-2 text-zinc-900">{variant.sku || "—"}</td>
                    <td className="py-2 tabular-nums text-zinc-900">
                      {variant.trackInventory ? variant.inventoryQuantity || "0" : "Not tracked"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
