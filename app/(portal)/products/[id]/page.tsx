import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { draftFromSubmission } from "@/lib/product-draft";
import { requireVendorUser } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";
import { discardPendingChanges } from "../actions";
import { ProductEditor } from "../product-editor";

export const metadata: Metadata = {
  title: "Product · StoreVendor",
};

const SAVED_MESSAGES: Record<string, string> = {
  draft: "Draft saved.",
  submitted: "Submitted for approval. The store will review it soon.",
  updated: "Changes saved. The store sees them when they review this product.",
  changes: "Changes sent to the store for approval.",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

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

  const isLive = submission.status === "APPROVED";
  const pendingDraft = (submission.pendingDraft ?? null) as Record<string, unknown> | null;
  // While a live product has an edit, the editor shows the edit, not the store's copy.
  const draft = draftFromSubmission(
    pendingDraft ? { ...submission, ...pendingDraft } : submission,
  );
  const savedMessage = typeof saved === "string" ? SAVED_MESSAGES[saved] : undefined;
  const mode = isLive ? "live" : submission.status === "PENDING" ? "pending" : "draft";

  const discard = discardPendingChanges.bind(null, submission.id);

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

      {isLive && submission.pendingSubmittedAt && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Changes waiting for the store to approve</p>
              <p className="mt-1">
                {`Sent ${dateFormat.format(submission.pendingSubmittedAt)}. The live product keeps its current details until then, and you can keep editing.`}
              </p>
            </div>
          </div>
          <form action={discard}>
            <button type="submit" className={`${secondaryButtonClass} border-amber-300 bg-white text-amber-900`}>
              Discard changes
            </button>
          </form>
        </div>
      )}

      {isLive && !submission.pendingSubmittedAt && submission.pendingReviewNote && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">The store didn&apos;t approve your changes</p>
              <p className="mt-1 whitespace-pre-line">{submission.pendingReviewNote}</p>
              <p className="mt-1">Your edits are still here. Update them and submit again.</p>
            </div>
          </div>
          <form action={discard}>
            <button type="submit" className={`${secondaryButtonClass} border-red-300 bg-white text-red-800`}>
              Discard changes
            </button>
          </form>
        </div>
      )}

      <ProductEditor
        submissionId={submission.id}
        initialDraft={draft}
        shopDomain={user.Vendor.shop}
        vendorId={user.vendorId}
        currencyCode={settings?.currencyCode ?? "USD"}
        collections={collections}
        mode={mode}
      />
    </div>
  );
}
