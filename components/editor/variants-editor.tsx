"use client";

import { useState } from "react";
import {
  hasVariantOptions,
  MAX_OPTIONS,
  syncVariants,
  variantLabel,
  type ProductOption,
  type VariantDraft,
} from "@/lib/product-draft";
import { errorClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { TagInput } from "./tag-input";

type VariantField = Exclude<keyof VariantDraft, "optionValues">;

const OPTION_SUGGESTIONS = ["Size", "Color", "Material", "Style"];

type Props = {
  options: ProductOption[];
  variants: VariantDraft[];
  trackInventory: boolean;
  errors: Record<string, string>;
  onChange: (next: { options: ProductOption[]; variants: VariantDraft[] }) => void;
};

export function VariantsEditor({ options, variants, trackInventory, errors, onChange }: Props) {
  const [bulkPrice, setBulkPrice] = useState("");

  const setOptions = (nextOptions: ProductOption[]) =>
    onChange({ options: nextOptions, variants: syncVariants(options, variants, nextOptions) });

  const updateOption = (index: number, patch: Partial<ProductOption>) =>
    setOptions(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  const updateVariant = (index: number, field: VariantField, value: string) =>
    onChange({
      options,
      variants: variants.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)),
    });

  const withVariants = hasVariantOptions(options);
  const fields: { field: VariantField; label: string; inputMode?: "decimal" | "numeric" }[] = [
    { field: "price", label: "Price", inputMode: "decimal" },
    { field: "compareAtPrice", label: "Compare-at price", inputMode: "decimal" },
    { field: "sku", label: "SKU" },
    { field: "barcode", label: "Barcode" },
    ...(trackInventory
      ? [{ field: "inventoryQuantity" as const, label: "Available", inputMode: "numeric" as const }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {!withVariants && variants[0] && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ field, label, inputMode }) => {
            const error = errors[`variants.0.${field}`];
            return (
              <div key={field}>
                <label htmlFor={`variant-0-${field}`} className={labelClass}>
                  {label}
                </label>
                <input
                  id={`variant-0-${field}`}
                  inputMode={inputMode}
                  value={variants[0][field]}
                  onChange={(event) => updateVariant(0, field, event.target.value)}
                  placeholder={inputMode === "decimal" ? "0.00" : undefined}
                  aria-invalid={Boolean(error)}
                  className={inputClass}
                />
                {error && <p className={errorClass}>{error}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 p-3">
            <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-start">
              <div>
                <label htmlFor={`option-${index}-name`} className={labelClass}>
                  Option name
                </label>
                <input
                  id={`option-${index}-name`}
                  list="option-name-suggestions"
                  value={option.name}
                  onChange={(event) => updateOption(index, { name: event.target.value })}
                  placeholder="Size"
                  aria-invalid={Boolean(errors[`options.${index}.name`])}
                  className={inputClass}
                />
                {errors[`options.${index}.name`] && (
                  <p className={errorClass}>{errors[`options.${index}.name`]}</p>
                )}
              </div>
              <div>
                <label htmlFor={`option-${index}-values`} className={labelClass}>
                  Values
                </label>
                <TagInput
                  id={`option-${index}-values`}
                  values={option.values}
                  onChange={(values) => updateOption(index, { values })}
                  placeholder="Type a value and press Enter"
                  max={100}
                  invalid={Boolean(errors[`options.${index}.values`])}
                />
                {errors[`options.${index}.values`] && (
                  <p className={errorClass}>{errors[`options.${index}.values`]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, i) => i !== index))}
                className="text-sm font-medium text-red-700 hover:underline sm:mt-7"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <datalist id="option-name-suggestions">
          {OPTION_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        {errors.options && <p className={errorClass}>{errors.options}</p>}
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setOptions([...options, { name: "", values: [] }])}
            className="text-sm font-semibold text-zinc-900 hover:underline"
          >
            + {options.length ? "Add another option" : "Add options like size or color"}
          </button>
        )}
      </div>

      {withVariants && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="bulk-price" className={labelClass}>
                Price for all variants
              </label>
              <input
                id="bulk-price"
                inputMode="decimal"
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.target.value)}
                placeholder="0.00"
                className={`${inputClass} w-32`}
              />
            </div>
            <button
              type="button"
              disabled={!bulkPrice.trim()}
              onClick={() => {
                onChange({
                  options,
                  variants: variants.map((variant) => ({ ...variant, price: bulkPrice.trim() })),
                });
                setBulkPrice("");
              }}
              className={secondaryButtonClass}
            >
              Apply
            </button>
          </div>

          {errors.variants && <p className={errorClass}>{errors.variants}</p>}

          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{`Variant (${variants.length})`}</th>
                  {fields.map(({ field, label }) => (
                    <th key={field} className="px-2 py-2 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => {
                  const label = variantLabel(variant.optionValues, options);
                  return (
                    <tr key={label} className="border-t border-zinc-100 align-top">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{label}</td>
                      {fields.map(({ field, label: fieldLabel, inputMode }) => {
                        const error = errors[`variants.${index}.${field}`];
                        return (
                          <td key={field} className="px-2 py-1.5">
                            <input
                              aria-label={`${label} ${fieldLabel}`}
                              inputMode={inputMode}
                              value={variant[field]}
                              onChange={(event) => updateVariant(index, field, event.target.value)}
                              placeholder={inputMode === "decimal" ? "0.00" : undefined}
                              aria-invalid={Boolean(error)}
                              title={error}
                              className={`${inputClass} min-w-24 px-2 py-1.5`}
                            />
                            {error && <p className="mt-0.5 text-xs text-red-700">{error}</p>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
