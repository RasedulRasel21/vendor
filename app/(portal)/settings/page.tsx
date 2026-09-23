import type { Metadata } from "next";
import { Card } from "@/components/editor/card";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { payoutRows } from "@/lib/payout";
import { requireVendorUser } from "@/lib/session";
import { cancelPayoutRequest, startStripe, switchToStripe } from "./actions";
import { stripeStatus } from "@/lib/store-app";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { ContactForm } from "./contact-form";
import { PayoutForm } from "./payout-form";
import { TaxForm } from "./tax-form";
import type { TaxInfo } from "@/lib/tax";

export const metadata: Metadata = {
  title: "Settings · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function DetailRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-zinc-500">{row.label}</dt>
          <dd className="text-zinc-900">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// What happened on the way back from Stripe, or why the vendor was sent back.
const STRIPE_NOTICE: Record<string, string> = {
  done: "Back from Stripe. Once Stripe has checked your details you can ask to be paid there.",
  retry: "The Stripe link expired. Start again to carry on where you left off.",
  "not-ready": "Stripe hasn't finished checking your account yet. Try again shortly.",
  requested: "Sent. The store approves the switch to Stripe like any payout change.",
  owner: "Only the account owner can connect Stripe.",
};

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireVendorUser();
  const vendor = user.Vendor;
  const isOwner = user.role === "OWNER";
  const { stripe: stripeParam, reason } = await searchParams;
  const stripeNotice =
    stripeParam === "error"
      ? `Stripe couldn't be opened: ${typeof reason === "string" ? reason : "try again"}`
      : typeof stripeParam === "string"
        ? STRIPE_NOTICE[stripeParam]
        : null;
  const stripe = await stripeStatus(vendor.id);
  const stripeInfo = "error" in stripe ? null : stripe;

  const [pendingRequest, latestReviewed] = await Promise.all([
    db.vendorChangeRequest.findFirst({
      where: { vendorId: vendor.id, type: "PAYOUT", status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    db.vendorChangeRequest.findFirst({
      where: { vendorId: vendor.id, type: "PAYOUT", status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
    }),
  ]);

  const rejectedRequest = !pendingRequest && latestReviewed?.status === "REJECTED" ? latestReviewed : null;
  const current = payoutRows(vendor.payoutMethod, vendor.payoutDetails);
  // Only the readable part goes to the page. The encrypted tax ID stays on the server, and
  // the portal has no key to read it anyway.
  const taxInfo = (vendor.taxInfo ?? null) as TaxInfo | null;
  const requested = pendingRequest
    ? payoutRows(
        (pendingRequest.requested as { method?: string } | null)?.method,
        (pendingRequest.requested as { details?: unknown } | null)?.details,
      )
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your contact details and where the store sends your earnings." />

      <Card title="Store profile" description="Contact the store to change your business name or sign-in email.">
        <DetailRows
          rows={[
            { label: "Business name", value: vendor.name },
            { label: "Sign-in email", value: user.email },
          ]}
        />
      </Card>

      <Card title="Contact details" description="Changes save straight away.">
        <ContactForm
          contact={{
            phone: vendor.phone ?? "",
            addressLine1: vendor.addressLine1 ?? "",
            addressLine2: vendor.addressLine2 ?? "",
            city: vendor.city ?? "",
            postalCode: vendor.postalCode ?? "",
            countryCode: vendor.countryCode ?? "",
          }}
        />
      </Card>

      <Card title="Payout details" description="Where the store sends your earnings. Changes need the store's approval.">
        <div className="space-y-4">
          {current.length ? (
            <DetailRows rows={current} />
          ) : (
            <p className="text-sm text-zinc-600">You haven&apos;t added payout details yet.</p>
          )}

          {pendingRequest && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Waiting for the store to approve</p>
                  <p className="text-sm text-amber-800">
                    {`Requested ${dateFormat.format(pendingRequest.createdAt)}. Your current details stay in use until then.`}
                  </p>
                </div>
                {isOwner && (
                  <form action={cancelPayoutRequest}>
                    <button
                      type="submit"
                      className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Withdraw request
                    </button>
                  </form>
                )}
              </div>
              <DetailRows rows={requested} />
            </div>
          )}

          {rejectedRequest && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">The store didn&apos;t approve your last payout change</p>
              {rejectedRequest.reviewNote && <p className="mt-1 whitespace-pre-line">{rejectedRequest.reviewNote}</p>}
            </div>
          )}

          {isOwner ? (
            <PayoutForm
              key={pendingRequest?.id ?? "no-request"}
              hasPayout={current.length > 0}
              hasPendingRequest={Boolean(pendingRequest)}
              paypalAutomatic={Boolean(stripeInfo?.paypal)}
            />
          ) : (
            <p className="text-sm text-zinc-500">Only the account owner can change payout details.</p>
          )}

          {/* Only when the store has connected Stripe: there's nothing to onboard to otherwise. */}
          {stripeInfo?.available && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Get paid through Stripe</p>
                <p className="mt-1 text-sm text-zinc-600">
                  The store can send payouts straight to a Stripe account instead of your bank or wallet.
                  Stripe checks who you are, then pays out to your bank on its own schedule.
                </p>
              </div>
              {stripeNotice && (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{stripeNotice}</p>
              )}
              {vendor.payoutMethod === "STRIPE" ? (
                <p className="text-sm font-medium text-primary-700">You&apos;re paid through Stripe.</p>
              ) : stripeInfo.transfersActive ? (
                <form action={switchToStripe}>
                  <button type="submit" className={primaryButtonClass}>
                    Ask to be paid through Stripe
                  </button>
                </form>
              ) : stripeInfo.detailsSubmitted ? (
                <p className="text-sm text-zinc-600">Stripe is checking your details. This usually takes a few minutes.</p>
              ) : (
                <form action={startStripe}>
                  <button type="submit" className={secondaryButtonClass}>
                    {stripeInfo.accountId ? "Finish setting up Stripe" : "Set up Stripe"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Tax details"
        description="Printed on your commission invoices, and used for the store's tax reporting where the law asks for it."
      >
        <div className="space-y-4">
          {taxInfo ? (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-zinc-500">Registered as</dt>
              <dd className="text-zinc-900">{taxInfo.entityType === "BUSINESS" ? "A business" : "An individual"}</dd>
              <dt className="text-zinc-500">Legal name</dt>
              <dd className="text-zinc-900">{taxInfo.legalName}</dd>
              <dt className="text-zinc-500">{taxInfo.taxIdType ?? "Tax ID"}</dt>
              <dd className="text-zinc-900">{`•••• ${taxInfo.taxIdLast4 ?? ""}`}</dd>
              <dt className="text-zinc-500">Country</dt>
              <dd className="text-zinc-900">{taxInfo.countryCode}</dd>
            </dl>
          ) : (
            <p className="text-sm text-zinc-600">Not added yet.</p>
          )}
          {isOwner ? (
            <TaxForm current={taxInfo} fallbackCountry={vendor.countryCode ?? ""} />
          ) : (
            <p className="text-sm text-zinc-500">Only the account owner can change tax details.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
