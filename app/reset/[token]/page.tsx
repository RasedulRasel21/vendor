import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { findReset } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Set a new password · StoreVendor",
  robots: { index: false },
};

const PROBLEMS = {
  invalid: {
    heading: "This link isn't valid",
    body: "It may have been used already, or replaced by a newer one. Ask for another and we'll send it.",
  },
  expired: {
    heading: "This link has run out",
    body: "Reset links last an hour. Ask for another and we'll send it.",
  },
};

export default async function ResetPage({ params }: PageProps<"/reset/[token]">) {
  const { token } = await params;
  const reset = await findReset(token);

  return (
    <AuthShell>
      {reset.status === "valid" ? (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-2 text-zinc-600">For {reset.email}.</p>
          <ResetForm token={token} email={reset.email} />
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{PROBLEMS[reset.status].heading}</h1>
          <p className="mt-2 text-zinc-600">{PROBLEMS[reset.status].body}</p>
          <p className="mt-8 text-sm text-zinc-600">
            <Link href="/forgot" className="font-semibold text-zinc-900 underline underline-offset-4">
              Send me another link
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
