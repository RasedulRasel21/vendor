"use client";

import { useActionState, useState } from "react";
import { Globe, MapPin, Plus, Trash2 } from "lucide-react";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { CountryPicker } from "./country-picker";
import { saveShipping, type ShippingFormState } from "./shipping-actions";
import type { VendorRate, VendorZone } from "@/lib/store-app";

const initialState: ShippingFormState = {};

type Rate = VendorRate & { key: string };
type Zone = { key: string; name: string; countryCodes: string[]; rates: Rate[] };

const blankRate = (): Rate => ({
  key: crypto.randomUUID(),
  name: "Standard",
  price: "",
  transitTime: "",
  minOrderTotal: "",
  maxOrderTotal: "",
});

const blankZone = (): Zone => ({
  key: crypto.randomUUID(),
  name: "",
  countryCodes: [],
  rates: [blankRate()],
});

export function ShippingForm({ zones: saved, currencyCode }: { zones: VendorZone[]; currencyCode: string }) {
  const [state, formAction, saving] = useActionState(saveShipping, initialState);
  const [zones, setZones] = useState<Zone[]>(
    saved.length
      ? saved.map((zone) => ({
          key: crypto.randomUUID(),
          name: zone.name,
          countryCodes: zone.countryCodes,
          rates: zone.rates.map((rate) => ({
            ...rate,
            transitTime: rate.transitTime ?? "",
            minOrderTotal: rate.minOrderTotal ?? "",
            maxOrderTotal: rate.maxOrderTotal ?? "",
            key: crypto.randomUUID(),
          })),
        }))
      : [blankZone()],
  );

  const errors = state.errors ?? {};

  const updateZone = (key: string, patch: Partial<Zone>) =>
    setZones((current) => current.map((zone) => (zone.key === key ? { ...zone, ...patch } : zone)));

  const updateRate = (zoneKey: string, rateKey: string, patch: Partial<Rate>) =>
    setZones((current) =>
      current.map((zone) =>
        zone.key === zoneKey
          ? { ...zone, rates: zone.rates.map((rate) => (rate.key === rateKey ? { ...rate, ...patch } : rate)) }
          : zone,
      ),
    );

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

      {/* Everything is posted as one field, so adding and removing needs no round trip. */}
      <input
        type="hidden"
        name="zones"
        value={JSON.stringify(
          zones.map((zone) => ({
            name: zone.name,
            countryCodes: zone.countryCodes,
            rates: zone.rates.map(({ name, price, transitTime, minOrderTotal, maxOrderTotal }) => ({
              name,
              price,
              transitTime,
              minOrderTotal,
              maxOrderTotal,
            })),
          })),
        )}
      />

      <ul className="space-y-5">
        {zones.map((zone, z) => (
          <li key={zone.key} className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="space-y-4 border-b border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-7 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 ring-1 ring-zinc-200">
                  {zone.countryCodes.length ? (
                    <MapPin className="size-4" aria-hidden />
                  ) : (
                    <Globe className="size-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`zone-${zone.key}`} className={labelClass}>
                    Zone name
                  </label>
                  <input
                    id={`zone-${zone.key}`}
                    value={zone.name}
                    onChange={(event) => updateZone(zone.key, { name: event.target.value })}
                    maxLength={60}
                    placeholder="Domestic"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-sm text-zinc-500">Just for you — the customer never sees it.</p>
                  {errors[`zones.${z}.name`] && <p className={errorClass}>{errors[`zones.${z}.name`]}</p>}
                </div>
              </div>

              <CountryPicker
                id={`countries-${zone.key}`}
                selected={zone.countryCodes}
                onChange={(countryCodes) => updateZone(zone.key, { countryCodes })}
              />
              {errors[`zones.${z}.countryCodes`] && <p className={errorClass}>{errors[`zones.${z}.countryCodes`]}</p>}
            </div>

            <div className="space-y-4 p-4">
              <p className="text-sm font-semibold text-zinc-900">Delivery options here</p>

              {errors[`zones.${z}.rates`] && <p className={errorClass}>{errors[`zones.${z}.rates`]}</p>}

              {zone.rates.map((rate, r) => (
                <div key={rate.key} className="rounded-lg border border-zinc-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,8rem)]">
                    <div>
                      <label htmlFor={`name-${rate.key}`} className={labelClass}>
                        What the customer sees
                      </label>
                      <input
                        id={`name-${rate.key}`}
                        value={rate.name}
                        onChange={(event) => updateRate(zone.key, rate.key, { name: event.target.value })}
                        maxLength={80}
                        placeholder="Standard"
                        className={inputClass}
                      />
                      {errors[`zones.${z}.rates.${r}.name`] && (
                        <p className={errorClass}>{errors[`zones.${z}.rates.${r}.name`]}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={`price-${rate.key}`} className={labelClass}>
                        Price ({currencyCode})
                      </label>
                      <input
                        id={`price-${rate.key}`}
                        value={rate.price}
                        onChange={(event) => updateRate(zone.key, rate.key, { price: event.target.value })}
                        inputMode="decimal"
                        placeholder="0.00"
                        className={inputClass}
                      />
                      {errors[`zones.${z}.rates.${r}.price`] && (
                        <p className={errorClass}>{errors[`zones.${z}.rates.${r}.price`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label htmlFor={`transit-${rate.key}`} className={labelClass}>
                      How long it takes (optional)
                    </label>
                    <input
                      id={`transit-${rate.key}`}
                      value={rate.transitTime}
                      onChange={(event) => updateRate(zone.key, rate.key, { transitTime: event.target.value })}
                      maxLength={80}
                      placeholder="3 to 5 days"
                      className={inputClass}
                    />
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                      Only for certain order values
                    </summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`min-${rate.key}`} className={labelClass}>
                          Order is at least ({currencyCode})
                        </label>
                        <input
                          id={`min-${rate.key}`}
                          value={rate.minOrderTotal}
                          onChange={(event) => updateRate(zone.key, rate.key, { minOrderTotal: event.target.value })}
                          inputMode="decimal"
                          placeholder="Any"
                          className={inputClass}
                        />
                        {errors[`zones.${z}.rates.${r}.minOrderTotal`] && (
                          <p className={errorClass}>{errors[`zones.${z}.rates.${r}.minOrderTotal`]}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`max-${rate.key}`} className={labelClass}>
                          and at most ({currencyCode})
                        </label>
                        <input
                          id={`max-${rate.key}`}
                          value={rate.maxOrderTotal}
                          onChange={(event) => updateRate(zone.key, rate.key, { maxOrderTotal: event.target.value })}
                          inputMode="decimal"
                          placeholder="Any"
                          className={inputClass}
                        />
                        {errors[`zones.${z}.rates.${r}.maxOrderTotal`] && (
                          <p className={errorClass}>{errors[`zones.${z}.rates.${r}.maxOrderTotal`]}</p>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 sm:col-span-2">
                        Leave both empty and this option always shows. To post free over 5,000: this
                        one at 0 with &ldquo;at least 5,000&rdquo;, and your paid one with
                        &ldquo;at most 4,999&rdquo;.
                      </p>
                    </div>
                  </details>

                  {zone.rates.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateZone(zone.key, { rates: zone.rates.filter((item) => item.key !== rate.key) })
                      }
                      className="mt-3 text-sm font-medium text-red-700 hover:underline"
                    >
                      Remove this option
                    </button>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateZone(zone.key, { rates: [...zone.rates, blankRate()] })}
                  className={secondaryButtonClass}
                >
                  <Plus className="size-4" aria-hidden />
                  Add a delivery option
                </button>
                {zones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setZones((current) => current.filter((item) => item.key !== zone.key))}
                    className={`${secondaryButtonClass} text-red-700`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove zone
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setZones((current) => [...current, blankZone()])}
          className={secondaryButtonClass}
        >
          <Plus className="size-4" aria-hidden />
          Add a zone
        </button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving…" : "Save shipping"}
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        A country can only be in one zone. A customer buying from you and another seller pays
        both of your delivery rates, because you each post your own parcel.
      </p>
    </form>
  );
}
