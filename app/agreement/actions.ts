"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireVendorUser } from "@/lib/session";
import { signAgreement } from "@/lib/store-app";

export type SignState = { errors?: Record<string, string> };

export async function sign(
  agreementId: string,
  _previousState: SignState,
  formData: FormData,
): Promise<SignState> {
  const user = await requireVendorUser();

  const signedName = String(formData.get("signedName") ?? "").trim();
  if (formData.get("agreed") !== "on") {
    return { errors: { agreed: "Tick the box to say you accept these terms." } };
  }

  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? head.get("x-real-ip") ?? null;

  const result = await signAgreement({
    vendorId: user.vendorId,
    vendorUserId: user.id,
    agreementId,
    signedName,
    email: user.email,
    ip,
  });

  if ("errors" in result) return { errors: result.errors };
  if ("error" in result) return { errors: { form: result.error } };

  redirect("/dashboard");
}
