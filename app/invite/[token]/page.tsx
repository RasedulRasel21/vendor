import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/portal/auth-shell";
import { findInvite } from "@/lib/invite";
import { AcceptInviteForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Accept your invite · StoreVendor",
  robots: { index: false },
};

const PROBLEMS = {
  invalid: {
    heading: "This invite link isn't valid",
    body: "It may have been used already or replaced by a newer link. Ask the store owner to send you a new invite.",
  },
  expired: {
    heading: "This invite link has expired",
    body: "Invite links work for 7 days. Ask the store owner to create a new one.",
  },
  unavailable: {
    heading: "This vendor account isn't active",
    body: "Contact the store owner for help.",
  },
};

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = await findInvite(token);

  return (
    <AuthShell>
      {invite.status === "valid" ? (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Join {invite.vendorName}</h1>
          <p className="mt-2 text-zinc-600">Create your password to start adding products.</p>
          <AcceptInviteForm token={token} email={invite.email} defaultName={invite.name ?? ""} />
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{PROBLEMS[invite.status].heading}</h1>
          <p className="mt-2 text-zinc-600">{PROBLEMS[invite.status].body}</p>
          <p className="mt-8 text-sm text-zinc-600">
            Already set up your account?{" "}
            <Link href="/login" className="font-semibold text-zinc-900 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
