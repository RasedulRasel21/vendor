"use client";

import { COUNTRIES } from "@/lib/countries";
import { currencySymbol } from "@/lib/money";
import { WEIGHT_UNITS, type VariantDraft, type WeightUnit } from "@/lib/product-draft";
import { errorClass, inputClass, labelClass } from "@/lib/ui";
import { CheckboxField, TextField } from "./fields";

type SectionProps = {
  variant: VariantDraft;
  onChange: (patch: Partial<VariantDraft>) => void;
  errors: Record<string, string>;
  // Field ids and error keys, for example "variants.0".
  fieldPrefix: string;
  currencyCode: string;
};

const countryNames = COUNTRIES;

const idFor = (prefix: string, field: string) => `${prefix}.${field}`.replace(/\./g, "-");

export function PricingFields({ variant, onChange, errors, fieldPrefix, currencyCode }: SectionProps) {
  const symbol = currencySymbol(currencyCode);
  const price = Number(variant.price);
  const cost = Number(variant.costPerItem);
  const hasMargin = variant.price.trim() !== "" && variant.costPerItem.trim() !== "" && price > 0;
  const profit = price - cost;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={idFor(fieldPrefix, "price")}
          label="Price"
          prefix={symbol}
          inputMode="decimal"
          placeholder="0.00"
          value={variant.price}
          onChange={(value) => onChange({ price: value })}
          error={errors[`${fieldPrefix}.price`]}
        />
        <TextField
          id={idFor(fieldPrefix, "compareAtPrice")}
          label="Compare-at price"
          prefix={symbol}
          inputMode="decimal"
          placeholder="0.00"
          value={variant.compareAtPrice}
          onChange={(value) => onChange({ compareAtPrice: value })}
          error={errors[`${fieldPrefix}.compareAtPrice`]}
          help="Shown crossed out to signal a sale."
        />
      </div>
      <CheckboxField
        id={idFor(fieldPrefix, "taxable")}
        label="Charge tax on this product"
        checked={variant.taxable}
        onChange={(checked) => onChange({ taxable: checked })}
      />
      <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-3">
        <TextField
          id={idFor(fieldPrefix, "costPerItem")}
          label="Cost per item"
          prefix={symbol}
          inputMode="decimal"
          placeholder="0.00"
          value={variant.costPerItem}
          onChange={(value) => onChange({ costPerItem: value })}
          error={errors[`${fieldPrefix}.costPerItem`]}
          help="Customers won't see this."
        />
        <div>
          <p className={labelClass}>Profit</p>
          <p className="py-2 text-sm tabular-nums text-zinc-700">
            {hasMargin ? `${symbol} ${profit.toFixed(2)}` : "--"}
          </p>
        </div>
        <div>
          <p className={labelClass}>Margin</p>
          <p className="py-2 text-sm tabular-nums text-zinc-700">
            {hasMargin ? `${((profit / price) * 100).toFixed(1)}%` : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InventoryFields({ variant, onChange, errors, fieldPrefix }: SectionProps) {
  return (
    <div className="space-y-4">
      <CheckboxField
        id={idFor(fieldPrefix, "trackInventory")}
        label="Track quantity"
        checked={variant.trackInventory}
        onChange={(checked) => onChange({ trackInventory: checked })}
      />
      {variant.trackInventory && (
        <>
          <div className="max-w-40">
            <TextField
              id={idFor(fieldPrefix, "inventoryQuantity")}
              label="Quantity available"
              inputMode="numeric"
              placeholder="0"
              value={variant.inventoryQuantity}
              onChange={(value) => onChange({ inventoryQuantity: value })}
              error={errors[`${fieldPrefix}.inventoryQuantity`]}
            />
          </div>
          <CheckboxField
            id={idFor(fieldPrefix, "continueSelling")}
            label="Continue selling when out of stock"
            checked={variant.continueSelling}
            onChange={(checked) => onChange({ continueSelling: checked })}
            help="Customers can buy this even when the quantity reaches zero."
          />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={idFor(fieldPrefix, "sku")}
          label="SKU (Stock Keeping Unit)"
          value={variant.sku}
          onChange={(value) => onChange({ sku: value })}
          error={errors[`${fieldPrefix}.sku`]}
        />
        <TextField
          id={idFor(fieldPrefix, "barcode")}
          label="Barcode (ISBN, UPC, GTIN, etc.)"
          value={variant.barcode}
          onChange={(value) => onChange({ barcode: value })}
          error={errors[`${fieldPrefix}.barcode`]}
        />
      </div>
    </div>
  );
}

export function ShippingFields({ variant, onChange, errors, fieldPrefix }: SectionProps) {
  const weightId = idFor(fieldPrefix, "weight");
  const countryId = idFor(fieldPrefix, "countryOfOrigin");

  return (
    <div className="space-y-4">
      <CheckboxField
        id={idFor(fieldPrefix, "requiresShipping")}
        label="This is a physical product"
        checked={variant.requiresShipping}
        onChange={(checked) => onChange({ requiresShipping: checked })}
      />
      {variant.requiresShipping ? (
        <>
          <div>
            <label htmlFor={weightId} className={labelClass}>
              Weight
            </label>
            <div className="flex max-w-56 gap-2">
              <input
                id={weightId}
                inputMode="decimal"
                placeholder="0.0"
                value={variant.weight}
                onChange={(event) => onChange({ weight: event.target.value })}
                aria-invalid={Boolean(errors[`${fieldPrefix}.weight`])}
                className={inputClass}
              />
              <select
                aria-label="Weight unit"
                value={variant.weightUnit}
                onChange={(event) => onChange({ weightUnit: event.target.value as WeightUnit })}
                className={`${inputClass} w-24`}
              >
                {WEIGHT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            {errors[`${fieldPrefix}.weight`] && <p className={errorClass}>{errors[`${fieldPrefix}.weight`]}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={countryId} className={labelClass}>
                Country/Region of origin
              </label>
              <select
                id={countryId}
                value={variant.countryOfOrigin}
                onChange={(event) => onChange({ countryOfOrigin: event.target.value })}
                aria-invalid={Boolean(errors[`${fieldPrefix}.countryOfOrigin`])}
                className={inputClass}
              >
                <option value="">Select country/region</option>
                {countryNames.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors[`${fieldPrefix}.countryOfOrigin`] && (
                <p className={errorClass}>{errors[`${fieldPrefix}.countryOfOrigin`]}</p>
              )}
            </div>
            <TextField
              id={idFor(fieldPrefix, "hsCode")}
              label="HS (Harmonized System) code"
              inputMode="numeric"
              placeholder="610910"
              value={variant.hsCode}
              onChange={(value) => onChange({ hsCode: value })}
              error={errors[`${fieldPrefix}.hsCode`]}
              help="Used by customs for international shipping."
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Customers won&apos;t enter shipping details at checkout. Use this for digital products or services.
        </p>
      )}
    </div>
  );
}
