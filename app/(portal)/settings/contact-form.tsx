"use client";

import { useActionState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { errorClass, inputClass, labelClass } from "@/lib/ui";
import { updateContact, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

const countries = COUNTRIES;

type Contact = {
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

function Field({
  name,
  label,
  defaultValue,
  error,
  autoComplete,
}: {
  name: keyof Contact;
  label: string;
  defaultValue: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`contact-${name}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`contact-${name}`}
        name={name}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={inputClass}
      />
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

export function ContactForm({ contact }: { contact: Contact }) {
  const [state, formAction, pending] = useActionState(updateContact, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="max-w-xs">
        <Field name="phone" label="Phone" defaultValue={contact.phone} error={errors.phone} autoComplete="tel" />
      </div>
      <Field
        name="addressLine1"
        label="Pickup and return address"
        defaultValue={contact.addressLine1}
        error={errors.addressLine1}
        autoComplete="address-line1"
      />
      <Field
        name="addressLine2"
        label="Apartment, suite, etc. (optional)"
        defaultValue={contact.addressLine2}
        error={errors.addressLine2}
        autoComplete="address-line2"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="city" label="City" defaultValue={contact.city} error={errors.city} autoComplete="address-level2" />
        <Field
          name="postalCode"
          label="Postal code"
          defaultValue={contact.postalCode}
          error={errors.postalCode}
          autoComplete="postal-code"
        />
        <div>
          <label htmlFor="contact-countryCode" className={labelClass}>
            Country/Region
          </label>
          <select
            id="contact-countryCode"
            name="countryCode"
            defaultValue={contact.countryCode}
            aria-invalid={Boolean(errors.countryCode)}
            className={inputClass}
          >
            <option value="">Select</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.countryCode && <p className={errorClass}>{errors.countryCode}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save contact details"}
        </button>
        {state.ok && !pending && (
          <p role="status" className="text-sm text-green-700">
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
