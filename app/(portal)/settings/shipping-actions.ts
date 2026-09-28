"use server";

import { revalidatePath } from "next/cache";
import { requireVendorUser } from "@/lib/session";
import { saveShippingRates, type VendorRate } from "@/lib/store-app";

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

  let rates: VendorRate[];
  try {
    const parsed = JSON.parse(String(formData.get("rates") ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error("not a list");
    rates = parsed;
  } catch {
    return { errors: { form: "Those rates couldn't be read. Refresh the page and try again." } };
  }

  const result = await saveShippingRates(user.vendorId, rates);
  if ("errors" in result) return { errors: result.errors };
  if ("error" in result) return { errors: { form: result.error } };

  revalidatePath("/settings");
  return { ok: true, warning: result.warning };
}
