import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Forgotten password · StoreVendor",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Forgotten your password?</h1>
      <p className="mt-2 text-zinc-600">
        Put in the address you sign in with and we&apos;ll send you a link to set a new one.
      </p>
      <ForgotForm />
      <p className="mt-6 text-sm text-zinc-600">
        <Link href="/login" className="font-medium text-primary-700 hover:underline">
          Back to signing in
        </Link>
      </p>
    </AuthShell>
  );
}
