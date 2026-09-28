"use server";

import { revalidatePath } from "next/cache";
import { requireVendorUser } from "@/lib/session";
import { saveShippingZones, type VendorZone } from "@/lib/store-app";

export type ShippingFormState = {
  ok?: boolean;
  warning?: string;
  errors?: Record<string, string>;
};

export async function saveShipping(
  _previousState: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  const user = await requireVendorUser();

  let zones: VendorZone[];
  try {
    const parsed = JSON.parse(String(formData.get("zones") ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error("not a list");
    zones = parsed;
  } catch {
    return { errors: { form: "That couldn't be read. Refresh the page and try again." } };
  }

  const result = await saveShippingZones(user.vendorId, zones);
  if ("errors" in result) return { errors: result.errors };
  if ("error" in result) return { errors: { form: result.error } };

  revalidatePath("/settings");
  return { ok: true, warning: result.warning };
}
