"use server";

import { headers } from "next/headers";
import { notifyByEmail } from "@/lib/notify";
import { startPasswordReset } from "@/lib/password-reset";

export type ForgotState = { sent?: boolean; error?: string; email?: string };

export async function requestReset(_previousState: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Put in the address you sign in with." };

  // The address this portal is actually being used on, so the link is one that works
  // rather than one built from a guess.
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const origin = host ? `${head.get("x-forwarded-proto") ?? "https"}://${host}` : "";

  const link = await startPasswordReset(email, origin);
  if (link) await notifyByEmail({ intent: "password-reset", email, url: link });

  // The same answer whether or not there is an account, so the form can't be used to find
  // out who sells in a store.
  return { sent: true, email };
}
