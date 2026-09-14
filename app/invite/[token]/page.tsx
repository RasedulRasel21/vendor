import type { Metadata } from "next";
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-zinc-500">StoreVendor vendor portal</p>

        {invite.status === "valid" ? (
          <>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              Join {invite.vendorName}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Set up your account to manage your products, orders, and earnings.
            </p>
            <AcceptInviteForm
              token={token}
              email={invite.email}
              defaultName={invite.name ?? ""}
            />
          </>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              {PROBLEMS[invite.status].heading}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{PROBLEMS[invite.status].body}</p>
          </>
        )}
      </div>
    </main>
  );
}
