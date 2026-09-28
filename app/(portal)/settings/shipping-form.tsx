"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { CountryPicker } from "./country-picker";
import { saveShipping, type ShippingFormState } from "./shipping-actions";
import type { VendorRate } from "@/lib/store-app";

const initialState: ShippingFormState = {};

type Row = VendorRate & { key: string };

const blank = (): Row => ({
  key: crypto.randomUUID(),
  name: "Standard",
  price: "",
  countryCodes: [],
  minOrderTotal: "",
  maxOrderTotal: "",
});

export function ShippingForm({ rates, currencyCode }: { rates: VendorRate[]; currencyCode: string }) {
  const [state, formAction, saving] = useActionState(saveShipping, initialState);
  const [rows, setRows] = useState<Row[]>(
    rates.length
      ? rates.map((rate) => ({
          ...rate,
          minOrderTotal: rate.minOrderTotal ?? "",
          maxOrderTotal: rate.maxOrderTotal ?? "",
          key: crypto.randomUUID(),
        }))
      : [blank()],
  );

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}
      {state.ok && !saving && (
        <p className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
          {state.warning ?? "Saved. Customers see these at checkout."}
        </p>
      )}

      {/* The rows are posted as one field, so adding and removing them needs no round trip. */}
      <input
        type="hidden"
        name="rates"
        value={JSON.stringify(
          rows.map(({ name, price, countryCodes, minOrderTotal, maxOrderTotal }) => ({
            name,
            price,
            countryCodes,
            minOrderTotal,
            maxOrderTotal,
          })),
        )}
      />

      <ul className="space-y-4">
        {rows.map((row, index) => (
          <li key={row.key} className="rounded-xl border border-zinc-200 p-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,8rem)]">
              <div>
                <label htmlFor={`name-${row.key}`} className={labelClass}>
                  What the customer sees
                </label>
                <input
                  id={`name-${row.key}`}
                  value={row.name}
                  onChange={(event) => update(row.key, { name: event.target.value })}
                  maxLength={80}
                  className={inputClass}
                  placeholder="Standard"
                />
                {errors[`rates.${index}.name`] && <p className={errorClass}>{errors[`rates.${index}.name`]}</p>}
              </div>
              <div>
                <label htmlFor={`price-${row.key}`} className={labelClass}>
                  Price ({currencyCode})
                </label>
                <input
                  id={`price-${row.key}`}
                  value={row.price}
                  onChange={(event) => update(row.key, { price: event.target.value })}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="0.00"
                />
                {errors[`rates.${index}.price`] && <p className={errorClass}>{errors[`rates.${index}.price`]}</p>}
              </div>
            </div>

            <div className="mt-4">
              <CountryPicker
                id={`where-${row.key}`}
                selected={row.countryCodes}
                onChange={(countryCodes) => update(row.key, { countryCodes })}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`min-${row.key}`} className={labelClass}>
                  Only when the order is at least ({currencyCode})
                </label>
                <input
                  id={`min-${row.key}`}
                  value={row.minOrderTotal}
                  onChange={(event) => update(row.key, { minOrderTotal: event.target.value })}
                  inputMode="decimal"
                  placeholder="Any"
                  className={inputClass}
                />
                {errors[`rates.${index}.minOrderTotal`] && (
                  <p className={errorClass}>{errors[`rates.${index}.minOrderTotal`]}</p>
                )}
              </div>
              <div>
                <label htmlFor={`max-${row.key}`} className={labelClass}>
                  and at most ({currencyCode})
                </label>
                <input
                  id={`max-${row.key}`}
                  value={row.maxOrderTotal}
                  onChange={(event) => update(row.key, { maxOrderTotal: event.target.value })}
                  inputMode="decimal"
                  placeholder="Any"
                  className={inputClass}
                />
                {errors[`rates.${index}.maxOrderTotal`] && (
                  <p className={errorClass}>{errors[`rates.${index}.maxOrderTotal`]}</p>
                )}
              </div>
              <p className="text-sm text-zinc-500 sm:col-span-2">
                Leave both empty and this rate always applies. To post free over 5,000: one
                rate at 0 with &ldquo;at least 5,000&rdquo;, and your normal rate with
                &ldquo;at most 4,999&rdquo;.
              </p>
            </div>

            {rows.length > 1 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  className={`${secondaryButtonClass} text-red-700`}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows((current) => [...current, blank()])} className={secondaryButtonClass}>
          <Plus className="size-4" aria-hidden />
          Add a rate
        </button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving…" : "Save rates"}
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        A customer buying from you and another seller pays both of your delivery rates,
        because you each post your own parcel.
      </p>
    </form>
  );
}
