import type { Metadata } from "next";
import { Card } from "@/components/editor/card";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { payoutRows } from "@/lib/payout";
import { requireVendorUser } from "@/lib/session";
import { cancelPayoutRequest } from "./actions";
import { ContactForm } from "./contact-form";
import { PayoutForm } from "./payout-form";

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

export default async function SettingsPage() {
  const user = await requireVendorUser();
  const vendor = user.Vendor;
  const isOwner = user.role === "OWNER";

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
            />
          ) : (
            <p className="text-sm text-zinc-500">Only the account owner can change payout details.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
