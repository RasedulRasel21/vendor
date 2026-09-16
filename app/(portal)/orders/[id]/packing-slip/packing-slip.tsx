"use client";

import { Minus, Package, Plus, Printer, QrCode, Truck } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { SlipData } from "@/lib/packing-slip";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type Options = {
  prices: boolean;
  skus: boolean;
  returnNote: boolean;
};

const CONTENT_OPTIONS: { key: keyof Options; label: string; help: string }[] = [
  { key: "prices", label: "Prices", help: "What the customer paid. Leave off for a gift" },
  { key: "skus", label: "SKU column and QR code", help: "Useful for scanning" },
  { key: "returnNote", label: "Return instructions", help: "Printed at the bottom" },
];

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function PackingSlipSheet({
  slip,
  options,
  compact,
}: {
  slip: SlipData;
  options: Options;
  compact: boolean;
}) {
  const currency = slip.currencyCode;

  return (
    <article
      className={`slip-sheet card-surface mx-auto w-full bg-white print:shadow-none ${
        compact ? "max-w-sm p-5 text-xs" : "max-w-3xl p-8 text-sm"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-display text-lg font-bold text-white"
          >
            {slip.vendorName.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight text-zinc-900">{slip.vendorName}</h1>
            <p className="text-zinc-500">Sold through {slip.shopName}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Packing slip</p>
            <p className="font-display text-xl font-bold text-zinc-900">{slip.orderName}</p>
            <p className="text-zinc-500">{dateFormat.format(slip.placedAt)}</p>
          </div>
          {options.skus && (
            <div
              aria-label={`QR code for ${slip.orderName}`}
              className="size-16 shrink-0 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: slip.qrSvg }}
            />
          )}
        </div>
      </header>

      <section className={`grid gap-4 border-b border-zinc-200 py-5 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Ship to</h2>
          {slip.addressLines.length ? (
            <address className="not-italic leading-6 text-zinc-800">
              {slip.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              {slip.phone && <span className="block tabular-nums text-zinc-600">{slip.phone}</span>}
            </address>
          ) : (
            <p className="text-zinc-600">No shipping address on this order.</p>
          )}
        </div>

        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</h2>
          <p className="leading-6 text-zinc-800">
            {slip.orderName}
            <span className="block text-zinc-600">{dateFormat.format(slip.placedAt)}</span>
          </p>
        </div>

        {(slip.carrier || slip.trackingNumber) && (
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Delivery</h2>
            <p className="flex items-center gap-1.5 font-medium text-zinc-900">
              <Truck className="size-4 text-primary-600" />
              {slip.carrier ?? "On its way"}
            </p>
            {slip.trackingNumber && (
              <p className="tabular-nums text-zinc-600">{`Tracking ${slip.trackingNumber}`}</p>
            )}
          </div>
        )}
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-2 font-semibold">Item</th>
            {options.skus && <th className="py-2 font-semibold">SKU</th>}
            <th className="py-2 text-center font-semibold">Ordered</th>
            <th className="py-2 text-center font-semibold">In this parcel</th>
            {options.prices && <th className="py-2 text-right font-semibold">Price</th>}
          </tr>
        </thead>
        <tbody>
          {slip.lines.map((line) => (
            <tr key={line.id} className="border-b border-zinc-100 align-top">
              <td className="py-3 pr-3">
                <span className="font-semibold text-zinc-900">{line.title}</span>
                {line.variantTitle && <span className="block text-zinc-500">{line.variantTitle}</span>}
                {line.refunded > 0 && (
                  <span className="block text-amber-700">{`${line.refunded} refunded, don't send`}</span>
                )}
                {line.shipped > 0 && line.toSend > 0 && (
                  <span className="block text-zinc-500">{`${line.shipped} already sent`}</span>
                )}
              </td>
              {options.skus && <td className="py-3 pr-3 tabular-nums text-zinc-700">{line.sku || "—"}</td>}
              <td className="py-3 text-center tabular-nums text-zinc-700">{line.ordered}</td>
              <td className="py-3 text-center text-base font-bold tabular-nums text-primary-700">{line.toSend}</td>
              {options.prices && (
                <td className="py-3 text-right tabular-nums text-zinc-900">{formatMoney(line.total, currency)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex flex-wrap items-start justify-between gap-6 pt-5">
        {options.returnNote ? (
          <p className="max-w-sm leading-relaxed text-zinc-600">
            Thanks for your order. Something wrong with it? Contact {slip.shopName}, who handles returns and
            refunds for this purchase.
          </p>
        ) : (
          <span />
        )}

        {options.prices && (
          <dl className="w-full max-w-72 space-y-1.5 rounded-lg bg-zinc-50 p-4">
            <div className="flex justify-between gap-4 font-semibold">
              <dt className="text-zinc-900">Items in this parcel</dt>
              <dd className="tabular-nums text-zinc-900">{formatMoney(slip.parcelTotal, currency)}</dd>
            </div>
            <p className="text-xs text-zinc-500">
              Shipping and tax are on your receipt from {slip.shopName}.
            </p>
          </dl>
        )}
      </section>
    </article>
  );
}

export function PackingSlipView({ slip }: { slip: SlipData }) {
  const [options, setOptions] = useState<Options>({ prices: true, skus: true, returnNote: true });
  const [thermal, setThermal] = useState(false);
  const [copies, setCopies] = useState(1);

  const toggle = (key: keyof Options) => setOptions((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      {/* Page size is set for the printer, and changes with the format picker. */}
      <style>{`@media print { @page { size: ${thermal ? "4in 6in" : "A4"}; margin: ${thermal ? "6mm" : "12mm"}; } }`}</style>

      <div className="space-y-4">
        {Array.from({ length: copies }, (_, copy) => (
          <PackingSlipSheet key={copy} slip={slip} options={options} compact={thermal} />
        ))}
      </div>

      <aside className="space-y-6 print:hidden">
        <section className="card-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
            <Printer className="size-4 text-primary-600" />
            Print setup
          </h2>

          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Paper</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
              {[
                { label: "A4 / Letter", value: false },
                { label: "Thermal 4 × 6", value: true },
              ].map((format) => (
                <button
                  key={format.label}
                  type="button"
                  onClick={() => setThermal(format.value)}
                  aria-pressed={thermal === format.value}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                    thermal === format.value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Include</p>
            <ul className="space-y-1">
              {CONTENT_OPTIONS.map((option) => (
                <li key={option.key}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={options[option.key]}
                      onChange={() => toggle(option.key)}
                      className="mt-0.5 size-4 accent-primary-600"
                    />
                    <span className="text-sm">
                      <span className="block font-medium text-zinc-900">{option.label}</span>
                      <span className="block text-xs text-zinc-500">{option.help}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900">Copies</span>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
              <button
                type="button"
                aria-label="One less copy"
                onClick={() => setCopies((count) => Math.max(1, count - 1))}
                className="flex size-7 items-center justify-center rounded-md bg-white text-zinc-700 shadow-sm hover:text-zinc-900"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{copies}</span>
              <button
                type="button"
                aria-label="One more copy"
                onClick={() => setCopies((count) => Math.min(5, count + 1))}
                className="flex size-7 items-center justify-center rounded-md bg-white text-zinc-700 shadow-sm hover:text-zinc-900"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          <button type="button" onClick={() => window.print()} className={`${primaryButtonClass} w-full`}>
            <Printer className="size-4" />
            Print slip
          </button>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <QrCode className="size-4 text-primary-600" />
            What&apos;s on the slip
          </h2>
          <p className="text-sm text-zinc-600">
            Only the items still to send, with refunded ones marked. The QR code holds the order number, so you
            can scan it back to this order.
          </p>
        </section>
      </aside>
    </div>
  );
}

export function BatchPrintButton({ count }: { count: number }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${secondaryButtonClass} print:hidden`}>
      <Package className="size-4" />
      {`Print ${count} ${count === 1 ? "slip" : "slips"}`}
    </button>
  );
}
