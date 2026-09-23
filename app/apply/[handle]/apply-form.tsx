"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { inputClass, labelClass, errorClass, primaryButtonClass } from "@/lib/ui";
import { apply, type ApplyState } from "./actions";

const initialState: ApplyState = {};

type Props = {
  handle: string;
  storeName: string;
  termsUrl: string | null;
  catalogueSizes: { value: string; label: string }[];
};

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-zinc-500">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ApplyForm({ handle, storeName, termsUrl, catalogueSizes }: Props) {
  const [state, formAction, pending] = useActionState(apply.bind(null, handle), initialState);
  const startedAt = useRef<HTMLInputElement>(null);

  // Filled in by the browser once the page is up. Rendering it on the server instead would
  // give every visitor the same time, and would differ between server and browser.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  const errors = state.errors ?? {};
  const invalid = (name: string) =>
    errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

  if (state.ok) {
    return (
      <div className="card-surface p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold text-zinc-900">
          {storeName} has your application
        </h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-600">
          Someone will read it and get back to you. If they take you on, you&apos;ll get an email
          with a link to set up your account and start adding products.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card-surface space-y-5 p-6 sm:p-8">
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <input type="hidden" name="startedAt" ref={startedAt} />
      {/* Not shown to anyone; only something filling in the whole page finds it. */}
      <div aria-hidden className="hidden">
        <label htmlFor="website2">Leave this empty</label>
        <input id="website2" name="website2" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field label="What do you sell under?" name="name" error={errors.name} hint="The name customers will see.">
        <input
          id="name"
          name="name"
          defaultValue={state.values?.name}
          required
          maxLength={80}
          className={inputClass}
          {...invalid("name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="contactName" error={errors.contactName}>
          <input
            id="contactName"
            name="contactName"
            defaultValue={state.values?.contactName}
            required
            maxLength={80}
            autoComplete="name"
            className={inputClass}
            {...invalid("contactName")}
          />
        </Field>
        <Field label="Email" name="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={state.values?.email}
            required
            maxLength={120}
            autoComplete="email"
            className={inputClass}
            {...invalid("email")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone (optional)" name="phone" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={state.values?.phone}
            maxLength={30}
            autoComplete="tel"
            className={inputClass}
            {...invalid("phone")}
          />
        </Field>
        <Field label="Where are you based?" name="countryCode" error={errors.countryCode}>
          <select
            id="countryCode"
            name="countryCode"
            defaultValue={state.values?.countryCode ?? ""}
            required
            className={inputClass}
            {...invalid("countryCode")}
          >
            <option value="">Choose a country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="What would you like to sell?"
        name="sells"
        error={errors.sells}
        hint="A line or two is plenty."
      >
        <textarea
          id="sells"
          name="sells"
          defaultValue={state.values?.sells}
          required
          rows={3}
          maxLength={500}
          className={inputClass}
          {...invalid("sells")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Roughly how many products? (optional)" name="catalogueSize" error={errors.catalogueSize}>
          <select
            id="catalogueSize"
            name="catalogueSize"
            defaultValue={state.values?.catalogueSize ?? ""}
            className={inputClass}
            {...invalid("catalogueSize")}
          >
            <option value="">Not sure yet</option>
            {catalogueSizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Website or social page (optional)"
          name="website"
          error={errors.website}
          hint="Anywhere they can see your work."
        >
          <input
            id="website"
            name="website"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={state.values?.website}
            maxLength={200}
            className={inputClass}
            {...invalid("website")}
          />
        </Field>
      </div>

      <Field label="Anything else (optional)" name="message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          defaultValue={state.values?.message}
          rows={3}
          maxLength={1000}
          className={inputClass}
          {...invalid("message")}
        />
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="agreedTerms"
            defaultChecked={state.values?.agreedTerms}
            className="mt-0.5 size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
            {...invalid("agreedTerms")}
          />
          <span>
            {termsUrl ? (
              <>
                I accept{" "}
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary-700 underline underline-offset-4"
                >
                  {storeName}&apos;s seller terms
                </a>
                .
              </>
            ) : (
              <>I agree to {storeName} getting in touch about selling with them.</>
            )}
          </span>
        </label>
        {errors.agreedTerms && (
          <p id="agreedTerms-error" className={errorClass}>
            {errors.agreedTerms}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full py-2.5`}>
        {pending ? "Sending…" : "Apply to sell"}
      </button>
    </form>
  );
}
