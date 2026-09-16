"use client";

import { useActionState, useState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { markShipped, type ShipFormState } from "./actions";

const initialState: ShipFormState = {};

// Common couriers in Bangladesh, plus the international ones Shopify links tracking for.
const CARRIERS = ["Pathao", "Steadfast", "RedX", "Sundarban", "Paperfly", "DHL", "FedEx", "UPS", "Other"];

export function ShipForm({ vendorOrderId }: { vendorOrderId: string }) {
  const [state, formAction, pending] = useActionState(markShipped.bind(null, vendorOrderId), initialState);
  const [confirming, setConfirming] = useState(false);
  const errors = state.errors ?? {};

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={primaryButtonClass}>
        Mark as shipped
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
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
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
