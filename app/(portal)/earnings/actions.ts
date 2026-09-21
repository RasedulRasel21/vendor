"use server";

import { revalidatePath } from "next/cache";
import { requireVendorUser } from "@/lib/session";
import { askForPayout } from "@/lib/store-app";

export type PayoutRequestState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

// Asks the store for the whole available balance. The store app checks the rules and
// records the request; nothing leaves the balance until the store accepts it.
export async function requestPayout(): Promise<PayoutRequestState> {
  const user = await requireVendorUser();

  const result = await askForPayout(user.vendorId, `vendor_user:${user.id}`);
  if ("error" in result) return { error: result.error };

  revalidatePath("/earnings");
  return { ok: true, message: "Sent. The store will let you know once it's on its way." };
}
