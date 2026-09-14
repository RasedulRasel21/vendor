"use client";

import { useActionState } from "react";
import type { ProductFormValues } from "@/lib/product-form";
import { saveProduct, type ProductFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

type FieldProps = {
  name: keyof ProductFormValues;
  label: string;
  hint?: string;
  values: ProductFormValues;
  error?: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  required?: boolean;
};

function Field({ name, label, hint, values, error, type = "text", inputMode, required }: FieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={values[name]}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={inputClass}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="mt-1 text-sm text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function ProductForm({
  submissionId,
  initialValues,
}: {
  submissionId: string | null;
  initialValues: ProductFormValues;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    saveProduct.bind(null, submissionId),
    { values: initialValues },
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <Field name="title" label="Title" values={values} error={errors.title} required />
        <div>
          <label htmlFor="description" className="text-sm font-medium text-zinc-800">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={values.description}
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="productType" label="Product type" hint="For example: T-shirt" values={values} />
          <Field
            name="tags"
            label="Tags"
            hint="Separate tags with commas."
            values={values}
            error={errors.tags}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Pricing and inventory</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="price"
            label="Price"
            inputMode="decimal"
            values={values}
            error={errors.price}
            required
          />
          <Field
            name="compareAtPrice"
            label="Compare-at price"
            hint="Optional. Shown as the original price."
            inputMode="decimal"
            values={values}
            error={errors.compareAtPrice}
          />
          <Field name="sku" label="SKU" values={values} />
          <Field name="barcode" label="Barcode" values={values} />
          <Field
            name="inventoryQuantity"
            label="Quantity available"
            inputMode="numeric"
            values={values}
            error={errors.inventoryQuantity}
          />
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-6">
        <label htmlFor="imageUrls" className="font-semibold text-zinc-900">
          Images
        </label>
        <p id="imageUrls-hint" className="text-sm text-zinc-500">
          Paste up to 10 image links, one per line. Each must start with https://.
        </p>
        <textarea
          id="imageUrls"
          name="imageUrls"
          rows={4}
          defaultValue={values.imageUrls}
          aria-invalid={Boolean(errors.imageUrls)}
          aria-describedby={errors.imageUrls ? "imageUrls-error" : "imageUrls-hint"}
          className={inputClass}
        />
        {errors.imageUrls && (
          <p id="imageUrls-error" className="text-sm text-red-700">
            {errors.imageUrls}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          Submit for approval
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
        >
          Save draft
        </button>
      </div>
    </form>
  );
}
