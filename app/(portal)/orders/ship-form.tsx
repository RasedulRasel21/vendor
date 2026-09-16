"use client";

import { useActionState, useState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { markShipped, type ShipFormState } from "./actions";

const initialState: ShipFormState = {};

// Common couriers in Bangladesh, plus the international ones Shopify links tracking for.
const CARRIERS = ["Pathao", "Steadfast", "RedX", "Sundarban", "Paperfly", "DHL", "FedEx", "UPS", "Other"];

export type ShippableLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  remaining: number;
};

export function ShipForm({ vendorOrderId, lines }: { vendorOrderId: string; lines: ShippableLine[] }) {
  const [state, formAction, pending] = useActionState(markShipped.bind(null, vendorOrderId), initialState);
  const [open, setOpen] = useState(false);
  const errors = state.errors ?? {};
  const severalItems = lines.length > 1 || lines.some((line) => line.remaining > 1);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        Mark as shipped
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      {severalItems && (
        <fieldset>
          <legend className={labelClass}>What&apos;s in this parcel?</legend>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{line.title}</p>
                  <p className="text-xs text-zinc-500">
                    {[line.variantTitle, `${line.remaining} left to send`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <label htmlFor={`qty-${line.id}`} className="sr-only">
                  {`Quantity of ${line.title} in this parcel`}
                </label>
                <input
                  id={`qty-${line.id}`}
                  name={`qty:${line.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={line.remaining}
                  defaultValue={line.remaining}
                  className={`${inputClass} w-20 text-center`}
                />
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-sm text-zinc-500">
            Send part of the order now and the rest later; each parcel gets its own tracking.
          </p>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="trackingCompany" className={labelClass}>
            Courier
          </label>
          <input
            id="trackingCompany"
            name="trackingCompany"
            list="carriers"
            placeholder="Pathao"
            aria-invalid={Boolean(errors.trackingCompany)}
            className={inputClass}
          />
          <datalist id="carriers">
            {CARRIERS.map((carrier) => (
              <option key={carrier} value={carrier} />
            ))}
          </datalist>
          {errors.trackingCompany && <p className={errorClass}>{errors.trackingCompany}</p>}
        </div>
        <div>
          <label htmlFor="trackingNumber" className={labelClass}>
            Tracking number
          </label>
          <input
            id="trackingNumber"
            name="trackingNumber"
            placeholder="Optional"
            aria-invalid={Boolean(errors.trackingNumber)}
            className={inputClass}
          />
          {errors.trackingNumber && <p className={errorClass}>{errors.trackingNumber}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="trackingUrl" className={labelClass}>
          Tracking link
        </label>
        <input
          id="trackingUrl"
          name="trackingUrl"
          placeholder="https://"
          inputMode="url"
          aria-invalid={Boolean(errors.trackingUrl)}
          className={inputClass}
        />
        {errors.trackingUrl ? (
          <p className={errorClass}>{errors.trackingUrl}</p>
        ) : (
          <p className="mt-1.5 text-sm text-zinc-500">
            The customer gets an email with these details as soon as you mark it shipped.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Marking shipped…" : "Mark as shipped"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
