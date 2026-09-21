import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireVendorUser } from "@/lib/session";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Invoice · StoreVendor",
};

type Party = { name?: string; address?: string; taxId?: string | null; email?: string };
type Line = { vendorOrderId: string; orderName: string; date: string; description: string; amount: string };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long" });
const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

// The invoice as it was issued. Everything printed comes from the invoice itself, so it
// reads the same however the store's details change afterwards.
export default async function InvoicePage({ params }: PageProps<"/earnings/invoices/[id]">) {
  const user = await requireVendorUser();
  const { id } = await params;

  const invoice = await db.commissionInvoice.findFirst({ where: { id, vendorId: user.vendorId } });
  if (!invoice) notFound();

  const seller = (invoice.seller ?? {}) as Party;
  const buyer = (invoice.buyer ?? {}) as Party;
  const lines = (invoice.lines ?? []) as Line[];
  const money = (value: { toString(): string } | string) => formatMoney(value.toString(), invoice.currencyCode);
  const credit = Number(invoice.total) < 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href="/earnings" className="text-sm font-semibold text-primary-700 underline-offset-4 hover:underline">
          Back to earnings
        </Link>
        <PrintButton />
      </div>

      <article className="card-surface mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900">
              {credit ? "Credit note" : "Commission invoice"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{`Marketplace commission, ${monthFormat.format(invoice.periodStart)}`}</p>
          </div>
          <dl className="text-right text-sm">
            <dt className="text-zinc-500">Number</dt>
            <dd className="font-semibold text-zinc-900">{invoice.number}</dd>
            <dt className="mt-2 text-zinc-500">Issued</dt>
            <dd className="text-zinc-900">{dateFormat.format(invoice.issuedAt)}</dd>
          </dl>
        </header>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="text-sm leading-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">From</p>
            <p className="font-semibold text-zinc-900">{seller.name}</p>
            <p className="text-zinc-700">{seller.address}</p>
            <p className="text-zinc-700">{`Tax number: ${seller.taxId}`}</p>
          </div>
          <div className="text-sm leading-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">To</p>
            <p className="font-semibold text-zinc-900">{buyer.name}</p>
            {buyer.address && <p className="text-zinc-700">{buyer.address}</p>}
            <p className="text-zinc-700">{buyer.email}</p>
            {buyer.taxId && <p className="text-zinc-700">{`Tax number: ${buyer.taxId}`}</p>}
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Order date</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={`${line.vendorOrderId}-${line.description}`} className="border-b border-zinc-100">
                <td className="py-2 text-zinc-900">{line.description}</td>
                <td className="py-2 text-zinc-600">{line.date}</td>
                <td className="py-2 text-right tabular-nums text-zinc-900">{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Net</dt>
            <dd className="tabular-nums text-zinc-900">{money(invoice.net)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">{`${invoice.taxLabel} at ${Number(invoice.taxRate)}%`}</dt>
            <dd className="tabular-nums text-zinc-900">{money(invoice.taxAmount)}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold">
            <dt className="text-zinc-900">Total</dt>
            <dd className="tabular-nums text-zinc-900">{money(invoice.total)}</dd>
          </div>
        </dl>

        <p className="mt-8 text-sm text-zinc-500">
          Commission is taken from your earnings before each payout, so there&apos;s nothing to pay on this
          invoice.
        </p>
      </article>
    </div>
  );
}
