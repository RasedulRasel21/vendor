"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth";
import { startSession } from "@/lib/session";

export type SignInState = {
  error?: string;
  email?: string;
};

const ERRORS = {
  invalid: "Email or password is incorrect.",
  locked: "Too many failed attempts. Try again in 15 minutes.",
  inactive: "Your vendor account isn't active. Contact the store owner.",
};

export async function signIn(_previousState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email.trim() || !password) {
    return { error: "Enter your email and password.", email };
  }

  const result = await verifyCredentials(email, password);
  if (!result.ok) return { error: ERRORS[result.reason], email };

  await startSession(result.userId);
  redirect("/dashboard");
}
