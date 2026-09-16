"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";
import { requestFulfillment } from "@/lib/store-app";

export type ShipFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

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
