"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { csvToProducts, MAX_CSV_BYTES } from "@/lib/product-csv";
import {
  parseProductPayload,
  validateProduct,
  type ProductErrors,
} from "@/lib/product-validation";
import { requireVendorUser } from "@/lib/session";
import { checkProductRules, productSubmitted, vendorPermissions } from "@/lib/store-app";

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

  // Some vendors are allowed to restock and edit but not to add anything new.
  if (!existing) {
    const { canCreateProducts } = await vendorPermissions(user.vendorId);
    if (!canCreateProducts) {
      return { errors: { form: "This store isn't taking new products from you at the moment. You can still edit the ones you have." } };
    }
  }

  // Submitting is the moment the store's own rules apply. Saving a draft never does:
  // half-finished work is the point of a draft.
  if (submit) {
    const { problems } = await checkProductRules(user.vendorId, existing?.id ?? null, {
      title: draft.title,
      descriptionHtml: draft.descriptionHtml,
      productType: draft.productType,
      imageUrls: draft.imageUrls,
    });
    if (problems.length) return { errors: { form: problems.join(" ") } };
  }
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
    if (submit) {
      await logActivity(user.vendorId, user.id, "product.submitted", id, fields.title);
      // A vendor the store trusts skips the queue: the app puts it in the store and tells
      // us so, and anyone else is simply waiting to be reviewed.
      const live = await productSubmitted(user.vendorId, id);
      redirect(`/products/${id}?saved=${live ? "live" : "submitted"}`);
    }
    redirect(`/products/${id}?saved=draft`);
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
    if (await productSubmitted(user.vendorId, existing.id)) {
      redirect(`/products/${existing.id}?saved=live`);
    }
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

// A copy to work from, always as a fresh draft: nothing about the original changes, and
// the copy has no history in the store — no product id, no review notes, no pending edit.
export async function duplicateProduct(submissionId: string) {
  const user = await requireVendorUser();

  const original = await db.productSubmission.findFirst({
    where: { id: submissionId, vendorId: user.vendorId },
  });
  if (!original) redirect("/products");

  const id = randomUUID();
  const now = new Date();

  await db.productSubmission.create({
    data: {
      id,
      shop: original.shop,
      vendorId: user.vendorId,
      submittedById: user.id,
      // Named so it's obvious which is which in a list of products.
      title: `${original.title} (copy)`.slice(0, 255),
      descriptionHtml: original.descriptionHtml,
      description: original.description,
      productType: original.productType,
      options: (original.options ?? Prisma.DbNull) as Prisma.InputJsonValue,
      variants: (original.variants ?? Prisma.DbNull) as Prisma.InputJsonValue,
      trackInventory: original.trackInventory,
      collectionIds: original.collectionIds,
      tags: original.tags,
      seoTitle: original.seoTitle,
      seoDescription: original.seoDescription,
      // The handle and the barcode belong to the original product, not to a copy of it.
      handle: null,
      barcode: null,
      sku: original.sku,
      price: original.price,
      compareAtPrice: original.compareAtPrice,
      inventoryQuantity: original.inventoryQuantity,
      imageUrls: original.imageUrls,
      status: "DRAFT",
      submittedAt: null,
      updatedAt: now,
    },
  });

  revalidatePath("/products");
  redirect(`/products/${id}?saved=copied`);
}

// Only a vendor's own drafts and products the store sent back can be thrown away here. A
// product awaiting approval is in front of the store, and one that's live is in the shop:
// neither is the vendor's alone to delete.
export async function deleteProduct(submissionId: string) {
  const user = await requireVendorUser();

  const product = await db.productSubmission.findFirst({
    where: { id: submissionId, vendorId: user.vendorId },
    select: { id: true, title: true, status: true },
  });
  if (!product) redirect("/products");
  if (product.status !== "DRAFT" && product.status !== "REJECTED") {
    redirect(`/products/${submissionId}?error=cannot-delete`);
  }

  await db.productSubmission.delete({ where: { id: product.id } });
  await logActivity(user.vendorId, user.id, "product.deleted", product.id, product.title);

  revalidatePath("/products");
  redirect("/products?saved=deleted");
}

export type ImportState = {
  created?: number;
  updated?: number;
  submitted?: number;
  problems?: { line: number | null; product: string; message: string }[];
  error?: string;
};

// A spreadsheet of products, turned into drafts. Nothing is ever submitted or published
// by an import: everything lands as a draft for the vendor to look over.
//
// Rows that can't be read don't stop the ones that can. Whatever went wrong is listed
// with its row number, and a product already here as a draft with the same title is
// updated rather than added twice, so fixing the file and uploading it again doesn't
// leave a trail of duplicates.
export async function importProducts(
  _previousState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireVendorUser();

  // Drafts by default. Ticking the box puts them in front of the store instead, which
  // means every product has to be complete enough to submit.
  const forSubmit = formData.get("submit") === "on";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (file.size > MAX_CSV_BYTES) {
    return { error: `That file is ${Math.round(file.size / 1024)} KB. The most we can take is 2 MB.` };
  }

  const { products, problems } = csvToProducts(await file.text());
  if (!products.length) {
    return { problems, error: problems.length ? undefined : "Nothing in that file looked like a product." };
  }

  // Their existing drafts, so a second upload of the same file corrects rather than repeats.
  const existing = await db.productSubmission.findMany({
    where: { vendorId: user.vendorId, status: "DRAFT" },
    select: { id: true, title: true },
  });
  const drafts = new Map(existing.map((row) => [row.title.trim().toLowerCase(), row.id]));

  let created = 0;
  let updated = 0;
  let submitted = 0;
  const now = new Date();

  for (const product of products) {
    const checked = validateProduct(product.draft, { forSubmit });
    if ("errors" in checked) {
      const [field, message] = Object.entries(checked.errors)[0] ?? ["", "Something didn't look right."];
      problems.push({
        line: product.rows[0],
        product: product.title,
        message: field ? `${field}: ${message}` : message,
      });
      continue;
    }

    const values = {
      title: checked.data.title,
      descriptionHtml: checked.data.descriptionHtml,
      productType: checked.data.productType,
      tags: checked.data.tags,
      collectionIds: checked.data.collectionIds,
      trackInventory: checked.data.trackInventory,
      seoTitle: checked.data.seoTitle,
      seoDescription: checked.data.seoDescription,
      handle: checked.data.handle,
      imageUrls: checked.data.imageUrls,
      options: checked.data.options as unknown as Prisma.InputJsonValue,
      variants: checked.data.variants as unknown as Prisma.InputJsonValue,
    };

    if (forSubmit) {
      const { problems: ruleProblems } = await checkProductRules(user.vendorId, null, {
        title: checked.data.title,
        descriptionHtml: checked.data.descriptionHtml ?? "",
        productType: checked.data.productType ?? "",
        imageUrls: checked.data.imageUrls,
      });
      if (ruleProblems.length) {
        for (const message of ruleProblems) {
          problems.push({ line: product.rows[0], product: product.title, message });
        }
        continue;
      }
    }

    const existingId = drafts.get(checked.data.title.trim().toLowerCase());
    const status = forSubmit ? "PENDING" : "DRAFT";
    const submittedAt = forSubmit ? now : null;

    if (existingId) {
      await db.productSubmission.update({
        where: { id: existingId },
        data: { ...values, status, submittedAt, updatedAt: now },
      });
      updated += 1;
      if (forSubmit) submitted += 1;
    } else {
      const id = randomUUID();
      await db.productSubmission.create({
        data: {
          id,
          shop: user.Vendor.shop,
          vendorId: user.vendorId,
          submittedById: user.id,
          ...values,
          status,
          submittedAt,
          updatedAt: now,
        },
      });
      drafts.set(checked.data.title.trim().toLowerCase(), id);
      created += 1;
      if (forSubmit) submitted += 1;
    }
  }

  if (created || updated) {
    await logActivity(user.vendorId, user.id, "product.imported", "", `${created + updated} products`);
    revalidatePath("/products");
  }

  return { created, updated, submitted, problems };
}
