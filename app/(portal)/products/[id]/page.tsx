import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
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

  const [submission, settings, collections] = await Promise.all([
    db.productSubmission.findFirst({ where: { id, vendorId: user.vendorId } }),
    db.shopSettings.findUnique({ where: { shop: user.Vendor.shop }, select: { currencyCode: true } }),
    db.shopCollection.findMany({
      where: { shop: user.Vendor.shop },
      orderBy: { title: "asc" },
      select: { collectionId: true, title: true, imageUrl: true },
    }),
  ]);
  if (!submission) notFound();

  const draft = draftFromSubmission(submission);
  const editable = EDITABLE_STATUSES.includes(submission.status);
  const savedMessage = typeof saved === "string" ? SAVED_MESSAGES[saved] : undefined;
  const currencyCode = settings?.currencyCode ?? "USD";

  return (
    <div>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title={submission.title}
        meta={<StatusBadge status={submission.status} />}
      />

      {savedMessage && (
        <p
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700"
        >
          <CircleCheck className="size-4 shrink-0" />
          {savedMessage}
        </p>
      )}

      {submission.status === "REJECTED" && submission.reviewNote && (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">The store asked for changes</p>
            <p className="mt-1 whitespace-pre-line">{submission.reviewNote}</p>
          </div>
        </div>
      )}

      {editable ? (
        <ProductEditor
          submissionId={submission.id}
          initialDraft={draft}
          shopDomain={user.Vendor.shop}
          vendorId={user.vendorId}
          currencyCode={currencyCode}
          collections={collections}
        />
      ) : (
        <div className="max-w-3xl space-y-4">
          <p className="flex items-center gap-2 card-surface px-4 py-3 text-sm text-zinc-700">
            {submission.status === "PENDING" ? (
              <Clock className="size-4 shrink-0 text-amber-600" />
            ) : (
              <CircleCheck className="size-4 shrink-0 text-emerald-600" />
            )}
            {submission.status === "PENDING"
              ? "The store is reviewing this product, so it can't be edited right now."
              : "This product is approved and live in the store."}
          </p>
          <div className="overflow-x-auto card-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Variant</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Available</th>
                </tr>
              </thead>
              <tbody>
                {draft.variants.map((variant) => {
                  const label = variantLabel(variant.optionValues, draft.options) || "Default";
                  return (
                    <tr key={label} className="border-t border-zinc-100">
                      <td className="px-5 py-3 font-medium text-zinc-900">{label}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-800">
                        {variant.price ? formatMoney(variant.price, currencyCode) : "—"}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">{variant.sku || "—"}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-800">
                        {variant.trackInventory ? variant.inventoryQuantity || "0" : "Not tracked"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
