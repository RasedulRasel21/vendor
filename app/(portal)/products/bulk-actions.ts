"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyByEmail } from "@/lib/notify";
import { FEATURES, NOT_INCLUDED, storePlan } from "@/lib/plan";
import { applyChange, type Change } from "@/lib/bulk-change";
import { draftFromSubmission } from "@/lib/product-draft";
import { validateProduct } from "@/lib/product-validation";
import { requireVendorUser } from "@/lib/session";

// Changing the price or the stock of twenty products, once, instead of twenty times.
//
// The rules don't change because several are being done at once: a draft is the vendor's
// own to edit, and a change to something already on sale still goes to the store for
// approval. What does change is the noise — one email about twenty changes, not twenty.

export type BulkState = { done?: string; error?: string };

// Enough for a real day's work, small enough that the request finishes.
const MAX_SELECTED = 50;

export async function bulkEdit(_previousState: BulkState, formData: FormData): Promise<BulkState> {
  const user = await requireVendorUser();

  const plan = await storePlan(user.Vendor.shop);
  if (!plan.has(FEATURES.BULK_TOOLS)) return { error: NOT_INCLUDED };

  const action = String(formData.get("action") ?? "");
  const ids = formData.getAll("ids").map(String).slice(0, MAX_SELECTED);
  if (!ids.length) return { error: "Tick the products you want to change first." };

  const products = await db.productSubmission.findMany({
    where: { id: { in: ids }, vendorId: user.vendorId },
  });
  if (!products.length) return { error: "Those products weren't found." };

  if (action === "delete") {
    // The same rule as deleting one: anything the store has already seen stays, so the
    // record of what was approved or turned down survives.
    const deletable = products.filter((p) => p.status === "DRAFT" || p.status === "REJECTED");
    if (!deletable.length) {
      return { error: "Only drafts and products sent back to you can be deleted." };
    }

    await db.productSubmission.deleteMany({ where: { id: { in: deletable.map((p) => p.id) } } });
    revalidatePath("/products");

    const kept = products.length - deletable.length;
    return {
      done:
        `${deletable.length} ${deletable.length === 1 ? "product" : "products"} deleted.` +
        (kept ? ` ${kept} kept: only drafts and products sent back can be deleted.` : ""),
    };
  }

  if (action !== "edit") return { error: "That isn't something we can do." };

  const field = String(formData.get("field") ?? "");
  if (field !== "price" && field !== "stock") return { error: "Pick the price or the stock." };

  const mode = String(formData.get("mode") ?? "set");
  const unit = String(formData.get("unit") ?? "amount");
  const raw = String(formData.get("value") ?? "").trim();
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || value < 0) return { error: "Put in a number of zero or more." };
  if (mode !== "set" && mode !== "up" && mode !== "down") return { error: "Pick what to do with it." };
  if (field === "price" && unit === "percent" && value > 100 && mode === "down") {
    return { error: "You can't take more than 100% off." };
  }

  const change: Change = { mode, unit: unit === "percent" ? "percent" : "amount", value };
  const now = new Date();

  let changed = 0;
  let waiting = 0;
  const skipped: string[] = [];

  for (const product of products) {
    const draft = applyChange(draftFromSubmission(product), field, change);
    const isLive = product.status === "APPROVED";

    // A change to something already on sale is checked as strictly as a submission,
    // because that is what it becomes.
    const result = validateProduct(draft, { forSubmit: isLive || product.status === "PENDING" });
    if ("errors" in result) {
      skipped.push(product.title);
      continue;
    }

    const { options, variants, ...fields } = result.data;
    const values = {
      ...fields,
      options: options as unknown as Prisma.InputJsonValue,
      variants: variants as unknown as Prisma.InputJsonValue,
      // Written by the editor, not by us: leaving it out keeps whatever is there.
      description: product.description,
    };

    if (isLive) {
      await db.productSubmission.update({
        where: { id: product.id },
        data: {
          pendingDraft: values as unknown as Prisma.InputJsonValue,
          pendingSubmittedAt: now,
          pendingReviewNote: null,
          updatedAt: now,
        },
      });
      waiting += 1;
    } else {
      await db.productSubmission.update({
        where: { id: product.id },
        data: { ...values, updatedAt: now },
      });
    }
    changed += 1;
  }

  if (changed) {
    await db.vendorActivity.create({
      data: {
        id: crypto.randomUUID(),
        vendorId: user.vendorId,
        action: field === "price" ? "product.bulk_price" : "product.bulk_stock",
        actor: `vendor_user:${user.id}`,
        details: { count: changed, mode, unit, value },
      },
    });
  }

  // One email about all of them. Twenty separate ones would be read as twenty problems.
  if (waiting) {
    await notifyByEmail({ intent: "products-changed", vendorId: user.vendorId, count: waiting });
  }

  revalidatePath("/products");

  return {
    done:
      changed === 0
        ? `Nothing was changed. ${skipped.length} ${skipped.length === 1 ? "product needs" : "products need"} finishing first.`
        : `${field === "price" ? "Price" : "Stock"} changed on ${changed} ${changed === 1 ? "product" : "products"}.` +
          (waiting ? ` ${waiting} ${waiting === 1 ? "is" : "are"} already on sale, so the store has to approve ${waiting === 1 ? "that one" : "those"}.` : "") +
          (skipped.length ? ` ${skipped.length} skipped: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? " and others" : ""} need finishing first.` : ""),
  };
}
