"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  parseProductPayload,
  validateProduct,
  type ProductErrors,
} from "@/lib/product-validation";
import { requireVendorUser } from "@/lib/session";

export type ProductEditorState = {
  errors?: ProductErrors;
};

// Creates (submissionId null) or updates a vendor's product. A product that's already live
// isn't changed here: the edit is stored and the store reviews it.
export async function saveProduct(
  submissionId: string | null,
  _previousState: ProductEditorState,
  formData: FormData,
): Promise<ProductEditorState> {
  const user = await requireVendorUser();
  const submit = formData.get("intent") === "submit";

  const draft = parseProductPayload(String(formData.get("payload") ?? ""));
  if (!draft) {
    return { errors: { form: "The product couldn't be read. Refresh the page and try again." } };
  }

  const existing = submissionId
    ? await db.productSubmission.findFirst({ where: { id: submissionId, vendorId: user.vendorId } })
    : null;
  if (submissionId && !existing) return { errors: { form: "This product wasn't found." } };

  const isLive = existing?.status === "APPROVED";
  // Changes to a live product always go for review, so they're validated as a submission.
  const result = validateProduct(draft, { forSubmit: submit || isLive });
  if ("errors" in result) return { errors: result.errors };

  const { options, variants, ...fields } = result.data;

  // Keep only collections that still exist in the store.
  const storeCollections = fields.collectionIds.length
    ? await db.shopCollection.findMany({
        where: { shop: user.Vendor.shop, collectionId: { in: fields.collectionIds } },
        select: { collectionId: true },
      })
    : [];
  const collectionIds = fields.collectionIds.filter((collectionId) =>
    storeCollections.some((collection) => collection.collectionId === collectionId),
  );

  const now = new Date();
  const values = {
    ...fields,
    collectionIds,
    description: null,
    options: options as unknown as Prisma.InputJsonValue,
    variants: variants as unknown as Prisma.InputJsonValue,
  };

  if (!existing) {
    const id = randomUUID();
    await db.productSubmission.create({
      data: {
        id,
        shop: user.Vendor.shop,
        vendorId: user.vendorId,
        submittedById: user.id,
        ...values,
        status: submit ? "PENDING" : "DRAFT",
        submittedAt: submit ? now : null,
        updatedAt: now,
      },
    });
    if (submit) await logActivity(user.vendorId, user.id, "product.submitted", id, fields.title);
    redirect(`/products/${id}?saved=${submit ? "submitted" : "draft"}`);
  }

  if (isLive) {
    await db.productSubmission.update({
      where: { id: existing.id },
      data: {
        pendingDraft: values as unknown as Prisma.InputJsonValue,
        pendingSubmittedAt: now,
        pendingReviewNote: null,
        updatedAt: now,
      },
    });
    await logActivity(user.vendorId, user.id, "product.changes_submitted", existing.id, fields.title);
    redirect(`/products/${existing.id}?saved=changes`);
  }

  // Draft, awaiting approval, or sent back: the vendor's own copy is updated in place.
  const status = existing.status === "PENDING" || submit ? "PENDING" : "DRAFT";
  await db.productSubmission.update({
    where: { id: existing.id },
    data: {
      ...values,
      status,
      submittedAt: status === "PENDING" && !existing.submittedAt ? now : existing.submittedAt,
      updatedAt: now,
    },
  });
  if (submit && existing.status !== "PENDING") {
    await logActivity(user.vendorId, user.id, "product.submitted", existing.id, fields.title);
  }

  redirect(`/products/${existing.id}?saved=${existing.status === "PENDING" ? "updated" : submit ? "submitted" : "draft"}`);
}

// Drops an edit to a live product and goes back to what's in the store.
export async function discardPendingChanges(submissionId: string) {
  const user = await requireVendorUser();

  await db.productSubmission.updateMany({
    where: { id: submissionId, vendorId: user.vendorId, status: "APPROVED" },
    data: { pendingDraft: Prisma.DbNull, pendingSubmittedAt: null, pendingReviewNote: null, updatedAt: new Date() },
  });

  revalidatePath(`/products/${submissionId}`);
}

function logActivity(vendorId: string, userId: string, action: string, submissionId: string, title: string) {
  return db.vendorActivity.create({
    data: {
      id: randomUUID(),
      vendorId,
      action,
      actor: `vendor_user:${userId}`,
      details: { submissionId, title },
    },
  });
}
