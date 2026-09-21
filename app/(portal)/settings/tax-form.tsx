"use client";

import { useActionState, useState } from "react";
import { COUNTRY_CODES } from "@/lib/countries";
import { EU_COUNTRIES, taxIdName, type TaxInfo } from "@/lib/tax";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { saveTax, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

const countries = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch {
    return COUNTRY_CODES.map((code) => ({ code, name: code }));
  }
})();

function Field({
  name,
  label,
  error,
  help,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  error?: string;
  help?: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={`tax-${name}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`tax-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={inputClass}
      />
      {error ? <p className={errorClass}>{error}</p> : help && <p className="mt-1 text-xs text-zinc-500">{help}</p>}
    </div>
  );
}

// Starts closed once details exist, so nobody retypes a tax ID by accident.
export function TaxForm({ current, fallbackCountry }: { current: TaxInfo | null; fallbackCountry: string }) {
  const [open, setOpen] = useState(!current);
  const [entityType, setEntityType] = useState<string>(current?.entityType ?? "INDIVIDUAL");
  const [country, setCountry] = useState<string>(current?.countryCode ?? fallbackCountry);
  const [state, formAction, pending] = useActionState(saveTax, initialState);
  const errors = state.errors ?? {};
  const inEu = EU_COUNTRIES.has(country);

  if (state.ok && !open) {
    return <p className="text-sm font-medium text-primary-700">Saved.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
        Update tax details
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 p-4">
      {errors.form && <p className={errorClass}>{errors.form}</p>}

      <fieldset>
        <legend className={labelClass}>Registered as</legend>
        <div className="flex gap-2">
          {[
            { value: "INDIVIDUAL", label: "An individual" },
            { value: "BUSINESS", label: "A business" },
          ].map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium ${
                entityType === option.value
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-zinc-300 text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              <input
                type="radio"
                name="entityType"
                value={option.value}
                checked={entityType === option.value}
                onChange={() => setEntityType(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="legalName"
          label={entityType === "BUSINESS" ? "Registered business name" : "Full legal name"}
          defaultValue={current?.legalName}
          error={errors.legalName}
        />
        <div>
          <label htmlFor="tax-countryCode" className={labelClass}>
            Country you&apos;re registered in
          </label>
          <select
            id="tax-countryCode"
            name="countryCode"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            aria-invalid={Boolean(errors.countryCode)}
            className={inputClass}
          >
            <option value="">Select</option>
            {countries.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
          {errors.countryCode && <p className={errorClass}>{errors.countryCode}</p>}
        </div>
        {/* Keyed so a number typed for one country isn't kept when switching to another. */}
        <Field
          key={`${country}-${entityType}`}
          name="taxId"
          label={taxIdName(country, entityType)}
          error={errors.taxId}
          help={current?.taxIdLast4 ? `Saved as •••• ${current.taxIdLast4}. Enter it again to save changes.` : undefined}
        />
        {entityType === "INDIVIDUAL" && (
          <Field
            name="dateOfBirth"
            label={inEu ? "Date of birth" : "Date of birth (optional)"}
            type="date"
            defaultValue={current?.dateOfBirth}
            error={errors.dateOfBirth}
            help={inEu ? "EU tax rules ask marketplaces for this." : undefined}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="line1" label="Registered address" defaultValue={current?.address?.line1} error={errors.line1} />
        <Field name="line2" label="Apartment, suite, etc. (optional)" defaultValue={current?.address?.line2} />
        <Field name="city" label="City" defaultValue={current?.address?.city} error={errors.city} />
        <Field name="postalCode" label="Postal code" defaultValue={current?.address?.postalCode} />
      </div>

      <p className="text-sm text-zinc-600">
        Your tax ID is encrypted and only used for your invoices and the store&apos;s tax reporting.
      </p>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save tax details"}
        </button>
        {current && (
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
      </div>
      {state.ok && <p className="text-sm font-medium text-primary-700">Saved.</p>}
    </form>
  );
}
