"use server";

import { headers } from "next/headers";
import { sendApplication, type ApplicationInput } from "@/lib/store-app";

export type ApplyState = {
  ok?: true;
  error?: string;
  errors?: Record<string, string>;
  values?: Partial<ApplicationInput>;
};

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

// The address the form came from, as the proxy in front of us saw it. Only ever passed on
// to the app, which keeps a hash of it to slow down a flood, never the address itself.
async function senderAddress() {
  const head = await headers();
  const forwarded = head.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || head.get("x-real-ip") || null;
}

export async function apply(handle: string, _previous: ApplyState, formData: FormData): Promise<ApplyState> {
  const values: ApplicationInput = {
    name: field(formData, "name"),
    contactName: field(formData, "contactName"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    countryCode: field(formData, "countryCode"),
    website: field(formData, "website"),
    sells: field(formData, "sells"),
    catalogueSize: field(formData, "catalogueSize"),
    message: field(formData, "message"),
    agreedTerms: formData.get("agreedTerms") === "on",
    website2: field(formData, "website2"),
  };

  // How long the form was on screen before it was sent. Set by the browser after the page
  // loads, so a form with no timing at all is simply not judged on it.
  const startedAt = Number(field(formData, "startedAt"));
  const elapsedMs = Number.isFinite(startedAt) && startedAt > 0 ? Date.now() - startedAt : undefined;

  const result = await sendApplication(handle, values, { ip: await senderAddress(), elapsedMs });

  if ("errors" in result && result.errors) return { errors: result.errors, values };
  if ("error" in result) {
    return { error: result.error === "notFound" ? "This page has moved or closed." : result.error, values };
  }
  return { ok: true };
}
