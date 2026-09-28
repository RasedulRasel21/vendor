"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { saveShipping, type ShippingFormState } from "./shipping-actions";
import type { VendorRate } from "@/lib/store-app";

const initialState: ShippingFormState = {};

type Row = VendorRate & { key: string };

const blank = (): Row => ({ key: crypto.randomUUID(), name: "Standard", price: "", countryCodes: [] });

export function ShippingForm({ rates, currencyCode }: { rates: VendorRate[]; currencyCode: string }) {
  const [state, formAction, saving] = useActionState(saveShipping, initialState);
  const [rows, setRows] = useState<Row[]>(
    rates.length ? rates.map((rate) => ({ ...rate, key: crypto.randomUUID() })) : [blank()],
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
        value={JSON.stringify(rows.map(({ name, price, countryCodes }) => ({ name, price, countryCodes })))}
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
              <label htmlFor={`where-${row.key}`} className={labelClass}>
                Where it applies
              </label>
              <select
                id={`where-${row.key}`}
                multiple
                size={5}
                value={row.countryCodes}
                onChange={(event) =>
                  update(row.key, {
                    countryCodes: Array.from(event.target.selectedOptions, (option) => option.value),
                  })
                }
                className={`${inputClass} h-auto`}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-sm text-zinc-500">
                {row.countryCodes.length
                  ? `${row.countryCodes.length} ${row.countryCodes.length === 1 ? "country" : "countries"}. Hold Ctrl or Cmd to pick more.`
                  : "Nothing picked, so this covers everywhere your other rates don't. Only one rate can do that."}
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
