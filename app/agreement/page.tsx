import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireVendorUser } from "@/lib/session";
import { agreementOwed } from "@/lib/store-app";
import { SignForm } from "./sign-form";

export const metadata: Metadata = {
  title: "Seller agreement · StoreVendor",
};

export default async function AgreementPage() {
  const user = await requireVendorUser();
  const owed = await agreementOwed(user.vendorId);
  // Nothing to sign: either the store has no agreement, or this one is already signed.
  if (!owed) redirect("/dashboard");

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
          {user.Vendor.name}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-zinc-900">{owed.title}</h1>
        <p className="mt-2 text-zinc-600">
          {user.Vendor.name} asks everyone selling with them to agree to these terms. Read
          them, then sign at the bottom. You can read them again later in Settings.
        </p>
      </header>

      <article className="card-surface max-h-[28rem] overflow-y-auto p-5 sm:p-6">
        <p className="whitespace-pre-line text-sm leading-6 text-zinc-800">{owed.body}</p>
      </article>

      <div className="card-surface mt-6 p-5 sm:p-6">
        <SignForm agreementId={owed.id} defaultName={user.name ?? ""} />
      </div>
    </div>
  );
}
