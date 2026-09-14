"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  readProductForm,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/product-form";
import { EDITABLE_STATUSES } from "@/lib/product-status";
import { requireVendorUser } from "@/lib/session";

export type ProductFormState = {
  errors?: ProductFormErrors;
  values?: ProductFormValues;
};

// Creates (submissionId null) or updates a vendor's product. The clicked button decides
// whether it's saved as a draft or sent for approval.
export async function saveProduct(
  submissionId: string | null,
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireVendorUser();
  const submit = formData.get("intent") === "submit";
  const values = readProductForm(formData);

  const result = validateProductForm(values, { forSubmit: submit });
  if ("errors" in result) return { errors: result.errors, values };

  const now = new Date();
  const status = submit ? "PENDING" : "DRAFT";
  let id = submissionId;

  if (submissionId) {
    const existing = await db.productSubmission.findFirst({
      where: { id: submissionId, vendorId: user.vendorId },
    });
    if (!existing) return { errors: { form: "This product wasn't found." }, values };
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return {
        errors: { form: "This product is awaiting approval or already approved, so it can't be edited." },
        values,
      };
    }

    await db.productSubmission.update({
      where: { id: existing.id },
      data: {
        ...result.data,
        status,
        submittedAt: submit ? now : existing.submittedAt,
        updatedAt: now,
      },
    });
  } else {
    id = randomUUID();
    await db.productSubmission.create({
      data: {
        id,
        shop: user.Vendor.shop,
        vendorId: user.vendorId,
        submittedById: user.id,
        ...result.data,
        status,
        submittedAt: submit ? now : null,
        updatedAt: now,
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
        details: { submissionId: id, title: result.data.title },
      },
    });
  }

  redirect(`/products/${id}?saved=${submit ? "submitted" : "draft"}`);
}
