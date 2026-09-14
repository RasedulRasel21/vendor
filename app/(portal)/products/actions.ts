"use server";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EDITABLE_STATUSES } from "@/lib/product-status";
import {
  parseProductPayload,
  validateProduct,
  type ProductErrors,
} from "@/lib/product-validation";
import { requireVendorUser } from "@/lib/session";

export type ProductEditorState = {
  errors?: ProductErrors;
};

// Creates (submissionId null) or updates a vendor's product. The clicked button decides
// whether it's saved as a draft or sent to the store for approval.
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

  const result = validateProduct(draft, { forSubmit: submit });
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
  const status = submit ? ("PENDING" as const) : ("DRAFT" as const);
  const record = {
    ...fields,
    collectionIds,
    description: null,
    options: options as unknown as Prisma.InputJsonValue,
    variants: variants as unknown as Prisma.InputJsonValue,
    status,
    updatedAt: now,
  };

  let id = submissionId;

  if (submissionId) {
    const existing = await db.productSubmission.findFirst({
      where: { id: submissionId, vendorId: user.vendorId },
    });
    if (!existing) return { errors: { form: "This product wasn't found." } };
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return {
        errors: { form: "This product is awaiting approval or already approved, so it can't be edited." },
      };
    }

    await db.productSubmission.update({
      where: { id: existing.id },
      data: { ...record, submittedAt: submit ? now : existing.submittedAt },
    });
  } else {
    id = randomUUID();
    await db.productSubmission.create({
      data: {
        id,
        shop: user.Vendor.shop,
        vendorId: user.vendorId,
        submittedById: user.id,
        ...record,
        submittedAt: submit ? now : null,
      },
    });
  }

  if (submit) {
    await db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "product.submitted",
        actor: `vendor_user:${user.id}`,
        details: { submissionId: id, title: fields.title },
      },
    });
  }

  redirect(`/products/${id}?saved=${submit ? "submitted" : "draft"}`);
}
