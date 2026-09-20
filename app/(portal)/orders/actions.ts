"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ISSUE_REASONS } from "@/lib/order-issues";
import { requireVendorUser } from "@/lib/session";
import { requestFulfillment } from "@/lib/store-app";

export type ShipFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

export type CarrierRequestState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Shopify lists no couriers for some countries, so vendors ask the store to add theirs.
export async function requestCarrier(
  _previousState: CarrierRequestState,
  formData: FormData,
): Promise<CarrierRequestState> {
  const user = await requireVendorUser();

  const name = field(formData, "name").slice(0, 60);
  const trackingUrlTemplate = field(formData, "trackingUrlTemplate").slice(0, 500);
  const reason = field(formData, "reason").slice(0, 500);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Enter the courier's name";
  if (reason.length < 5) errors.reason = "Tell the store why you need this courier";
  if (trackingUrlTemplate) {
    try {
      if (new URL(trackingUrlTemplate.replace("{tracking_number}", "123")).protocol !== "https:") {
        errors.trackingUrlTemplate = "Use a link starting with https://";
      }
    } catch {
      errors.trackingUrlTemplate = "Use a link starting with https://";
    }
  }
  if (Object.keys(errors).length) return { errors };

  const existing = await db.shopCarrier.findFirst({
    where: { shop: user.Vendor.shop, name: { equals: name, mode: "insensitive" } },
    select: { status: true },
  });
  if (existing?.status === "APPROVED") return { errors: { name: "That courier is already on the list." } };
  if (existing?.status === "PENDING") return { errors: { name: "The store is already looking at that one." } };

  const now = new Date();
  await db.$transaction([
    db.shopCarrier.upsert({
      where: { shop_name: { shop: user.Vendor.shop, name } },
      update: { status: "PENDING", trackingUrlTemplate: trackingUrlTemplate || null, reason, reviewNote: null, updatedAt: now },
      create: {
        id: randomUUID(),
        shop: user.Vendor.shop,
        name,
        trackingUrlTemplate: trackingUrlTemplate || null,
        reason,
        requestedByVendorId: user.vendorId,
        updatedAt: now,
      },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "carrier.requested",
        actor: `vendor_user:${user.id}`,
        details: { name, reason },
      },
    }),
  ]);

  // Every order page shows the courier list, so refresh the whole section.
  revalidatePath("/orders", "layout");
  return { ok: true };
}

export type IssueFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

// Taking an order on is the vendor saying they'll pack it, which is what the store watches
// for. Opening it isn't the same thing, so it's a deliberate click.
export async function acceptOrder(vendorOrderId: string): Promise<IssueFormState> {
  const user = await requireVendorUser();

  const order = await db.vendorOrder.findFirst({
    where: { id: vendorOrderId, vendorId: user.vendorId },
    select: { id: true, orderName: true, status: true, acceptedAt: true, shippingMode: true },
  });
  if (!order) return { errors: { form: "This order wasn't found." } };
  if (order.acceptedAt) return { ok: true };
  if (!["OPEN", "PARTIAL"].includes(order.status)) {
    return { errors: { form: "This order is already shipped or cancelled." } };
  }

  await db.$transaction([
    db.vendorOrder.update({
      where: { id: order.id },
      data: { acceptedAt: new Date(), vendorSeenAt: new Date() },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "order.accepted",
        actor: `vendor_user:${user.id}`,
        details: { orderName: order.orderName },
      },
    }),
  ]);

  // The sidebar counts unopened orders, so it has to be refreshed too.
  revalidatePath("/", "layout");
  revalidatePath(`/orders/${order.id}`);
  return { ok: true };
}

// Cancelling and refunding are the store's to do, so this tells them rather than doing it.
export async function reportProblem(
  vendorOrderId: string,
  _previousState: IssueFormState,
  formData: FormData,
): Promise<IssueFormState> {
  const user = await requireVendorUser();

  const order = await db.vendorOrder.findFirst({
    where: { id: vendorOrderId, vendorId: user.vendorId },
    select: { id: true, orderName: true, status: true },
  });
  if (!order) return { errors: { form: "This order wasn't found." } };
  if (!["OPEN", "PARTIAL"].includes(order.status)) {
    return { errors: { form: "This order is already shipped or cancelled." } };
  }

  const reason = field(formData, "reason");
  const note = field(formData, "note").slice(0, 1000);
  if (!(reason in ISSUE_REASONS)) return { errors: { reason: "Pick what's wrong" } };
  if (reason === "OTHER" && note.length < 5) {
    return { errors: { note: "Tell the store what the problem is" } };
  }

  const open = await db.vendorOrderIssue.findFirst({
    where: { vendorOrderId: order.id, status: "OPEN" },
    select: { id: true },
  });
  if (open) return { errors: { form: "You've already told the store about this order." } };

  await db.$transaction([
    db.vendorOrderIssue.create({
      data: { id: randomUUID(), vendorOrderId: order.id, reason, note: note || null },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "order.issue_raised",
        actor: `vendor_user:${user.id}`,
        details: { orderName: order.orderName, reason, note: note || null },
      },
    }),
  ]);

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return { ok: true };
}

// The vendor sorted it out themselves, so the store shouldn't still be chasing it.
export async function withdrawProblem(vendorOrderId: string): Promise<IssueFormState> {
  const user = await requireVendorUser();

  const issue = await db.vendorOrderIssue.findFirst({
    where: { vendorOrderId, status: "OPEN", VendorOrder: { vendorId: user.vendorId } },
    select: { id: true, VendorOrder: { select: { orderName: true } } },
  });
  if (!issue) return { errors: { form: "There's nothing open on this order." } };

  await db.$transaction([
    db.vendorOrderIssue.update({
      where: { id: issue.id },
      data: { status: "WITHDRAWN", resolvedAt: new Date() },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "order.issue_withdrawn",
        actor: `vendor_user:${user.id}`,
        details: { orderName: issue.VendorOrder.orderName },
      },
    }),
  ]);

  revalidatePath("/orders");
  revalidatePath(`/orders/${vendorOrderId}`);
  return { ok: true };
}

// Marks the vendor's lines shipped. The app does the Shopify part and emails the customer.
export async function markShipped(
  vendorOrderId: string,
  _previousState: ShipFormState,
  formData: FormData,
): Promise<ShipFormState> {
  const user = await requireVendorUser();

  const order = await db.vendorOrder.findFirst({
    where: { id: vendorOrderId, vendorId: user.vendorId },
    select: { id: true, status: true, VendorOrderLine: { select: { id: true } } },
  });
  if (!order) return { errors: { form: "This order wasn't found." } };
  if (!["OPEN", "PARTIAL"].includes(order.status)) {
    return { errors: { form: "This order is already shipped or cancelled." } };
  }

  // Quantities per line, when the vendor sends part of the order.
  const items = order.VendorOrderLine.map((line) => {
    const value = formData.get(`qty:${line.id}`);
    return { lineId: line.id, quantity: value === null ? 0 : Math.trunc(Number(value)) };
  }).filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

  if (formData.has(`qty:${order.VendorOrderLine[0]?.id}`) && !items.length) {
    return { errors: { form: "Choose at least one item to ship." } };
  }

  const trackingNumber = field(formData, "trackingNumber");
  const trackingCompany = field(formData, "trackingCompany");
  const trackingUrl = field(formData, "trackingUrl");

  const errors: Record<string, string> = {};
  if (trackingNumber.length > 100) errors.trackingNumber = "Use 100 characters or fewer";
  if (trackingCompany.length > 100) errors.trackingCompany = "Use 100 characters or fewer";
  if (trackingUrl) {
    try {
      if (new URL(trackingUrl).protocol !== "https:") errors.trackingUrl = "Use a link starting with https://";
    } catch {
      errors.trackingUrl = "Use a link starting with https://";
    }
  }
  if (Object.keys(errors).length) return { errors };

  const result = await requestFulfillment({
    vendorOrderId: order.id,
    vendorId: user.vendorId,
    trackingNumber,
    trackingCompany,
    trackingUrl,
    items,
  });
  if ("error" in result) return { errors: { form: result.error } };

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return { ok: true };
}
