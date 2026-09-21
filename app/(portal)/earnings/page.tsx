import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { payoutMethodLabel } from "@/lib/payout";
import { requireVendorUser } from "@/lib/session";
import { payoutSummary } from "@/lib/store-app";
import { RequestButton } from "./request-button";

export const metadata: Metadata = {
  title: "Earnings · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

const ENTRY_TYPE: Record<string, string> = {
  SALE: "Sale",
  REFUND: "Refund",
  CANCELLATION: "Cancelled",
  ADJUSTMENT: "Adjustment",
  PAYOUT: "Payout",
  PAYOUT_REVERSAL: "Payout returned",
};

const PAYOUT_STATUS: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: "Asked for", className: "bg-secondary-50 text-secondary-700" },
  PENDING: { label: "On its way", className: "bg-tertiary-100 text-tertiary-600" },
  PAID: { label: "Sent", className: "bg-primary-50 text-primary-700" },
  FAILED: { label: "Bounced", className: "bg-red-50 text-red-700" },
  CANCELLED: { label: "Called off", className: "bg-zinc-100 text-zinc-600" },
};

const STATEMENT_ROWS = 50;

export default async function EarningsPage() {
  const user = await requireVendorUser();
  const vendorId = user.vendorId;

  const [summary, entries, total, payouts, months] = await Promise.all([
    payoutSummary(vendorId),
    db.ledgerEntry.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: STATEMENT_ROWS,
      select: {
        id: true,
        type: true,
        amount: true,
        currencyCode: true,
        description: true,
        vendorOrderId: true,
        createdAt: true,
      },
    }),
    db.ledgerEntry.aggregate({ where: { vendorId }, _sum: { amount: true } }),
    db.payout.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.$queryRaw<{ month: string }[]>`
      SELECT DISTINCT to_char("createdAt", 'YYYY-MM') AS month
      FROM "LedgerEntry" WHERE "vendorId" = ${vendorId}
      ORDER BY month DESC LIMIT 24`,
  ]);

  const failed = "error" in summary;
  const currency = failed ? (entries[0]?.currencyCode ?? "USD") : summary.currencyCode;
  const money = (value: number | string) => formatMoney(Number(value).toFixed(2), currency);

  // Newest first, so the running figure is worked backwards from today's total: what was
  // owed after a row is today's total less every newer row.
  const latestTotal = Number(total._sum.amount ?? 0);
  const statement = entries.map((entry, index) => ({
    ...entry,
    owedAfter: entries.slice(0, index).reduce((owed, newer) => owed - Number(newer.amount), latestTotal),
  }));

  const tiles = failed
    ? []
    : [
        {
          label: "Available",
          value: money(summary.available),
          note: "Ready to be paid out",
          strong: true,
        },
        {
          label: "Not yet available",
          value: money(summary.pending),
          note: `Released ${summary.holdDays} ${summary.holdDays === 1 ? "day" : "days"} after an order is paid and shipped`,
        },
        { label: "On its way", value: money(summary.inFlight), note: "Set aside by the store" },
        { label: "Paid so far", value: money(summary.paid), note: "Everything sent to you" },
      ];

  return (
    <div>
      <PageHeader title="Earnings" description="What the store owes you, and what it has already paid." />

      {failed ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {`Your balance couldn't be loaded right now: ${summary.error} Your statement below is still up to date.`}
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="card-surface px-5 py-4">
                <p className="text-sm text-zinc-500">{tile.label}</p>
                <p
                  className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                    tile.strong ? "text-primary-700" : "text-zinc-900"
                  }`}
                >
                  {tile.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{tile.note}</p>
              </div>
            ))}
          </div>

          <div className="card-surface mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">Getting paid</p>
              <p className="mt-1 text-sm text-zinc-600">
                {summary.openPayout
                  ? summary.openPayout.status === "REQUESTED"
                    ? `You asked for ${money(summary.openPayout.amount)}. The store will accept it or be in touch.`
                    : `${money(summary.openPayout.amount)} is on its way. It shows as sent once the store has paid it.`
                  : !summary.hasPayoutDetails
                    ? "Add where you want to be paid before the store can pay you."
                    : !summary.requestsAllowed
                      ? "The store pays out on its own schedule."
                      : summary.available <= 0
                        ? "Nothing is available to pay out yet."
                        : summary.available < summary.minimum
                          ? `Payouts start at ${money(summary.minimum)}. You'll be able to ask once you reach it.`
                          : "Ask for your available balance and the store will send it."}
              </p>
            </div>
            {summary.canRequest ? (
              <RequestButton label={`Ask for ${money(summary.available)}`} />
            ) : (
              !summary.hasPayoutDetails && (
                <Link
                  href="/settings"
                  className="text-sm font-semibold text-primary-700 underline-offset-4 hover:underline"
                >
                  Add payout details
                </Link>
              )
            )}
          </div>
        </>
      )}

      {payouts.length > 0 && (
        <section className="card-surface mb-6">
          <h2 className="border-b border-zinc-200 px-6 py-4 font-display text-lg font-semibold text-zinc-900">
            Payouts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">To</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => {
                  const status = PAYOUT_STATUS[payout.status];
                  return (
                    <tr key={payout.id} className="border-t border-zinc-100">
                      <td className="px-6 py-3 text-zinc-700">
                        {dateFormat.format(payout.paidAt ?? payout.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        {payoutMethodLabel(payout.method) || "—"}
                        {payout.reference && (
                          <span className="block text-xs text-zinc-500">{`Ref ${payout.reference}`}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            status?.className ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {status?.label ?? payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {money(payout.amount.toString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-zinc-900">Statement</h2>
          {months.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">Download</span>
              {months.slice(0, 6).map(({ month }) => (
                <a
                  key={month}
                  href={`/earnings/statement?month=${month}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-zinc-700 hover:bg-zinc-50"
                >
                  <Download className="size-3.5" />
                  {monthFormat.format(new Date(`${month}-01T00:00:00Z`))}
                </a>
              ))}
            </div>
          )}
        </div>

        {statement.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-zinc-900">Nothing yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              Every sale, refund and payout shows up here as it happens.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">What</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-6 py-3 text-right font-medium">Owed after</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((entry) => {
                  const credit = Number(entry.amount) >= 0;
                  return (
                    <tr key={entry.id} className="border-t border-zinc-100">
                      <td className="px-6 py-3 text-zinc-500">{dateFormat.format(entry.createdAt)}</td>
                      <td className="px-3 py-3">
                        {entry.vendorOrderId ? (
                          <Link href={`/orders/${entry.vendorOrderId}`} className="font-medium text-zinc-900 hover:underline">
                            {entry.description}
                          </Link>
                        ) : (
                          <span className="font-medium text-zinc-900">{entry.description}</span>
                        )}
                        <span className="block text-xs text-zinc-500">{ENTRY_TYPE[entry.type] ?? entry.type}</span>
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-medium tabular-nums ${
                          credit ? "text-primary-700" : "text-red-700"
                        }`}
                      >
                        {`${credit ? "+" : "−"}${money(Math.abs(Number(entry.amount)))}`}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-600">{money(entry.owedAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {entries.length === STATEMENT_ROWS && (
          <p className="border-t border-zinc-100 px-6 py-3 text-sm text-zinc-500">
            Showing the latest {STATEMENT_ROWS}. Download a month for everything in it.
          </p>
        )}
      </section>
    </div>
  );
}
