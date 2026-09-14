import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/portal/auth-shell";
import { getCurrentVendorUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · StoreVendor",
};

export default async function LoginPage() {
  if (await getCurrentVendorUser()) redirect("/dashboard");

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-zinc-600">Use the email and password you set up from your invite.</p>
      <LoginForm />
    </AuthShell>
  );
}
