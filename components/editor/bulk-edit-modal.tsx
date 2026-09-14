"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/money";
import { WEIGHT_UNITS, type VariantDraft, type WeightUnit } from "@/lib/product-draft";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { TextField } from "./fields";
import { Modal } from "./modal";

type Toggle = "" | "yes" | "no";

function ToggleSelect({
  id,
  label,
  yes,
  no,
  value,
  onChange,
}: {
  id: string;
  label: string;
  yes: string;
  no: string;
  value: Toggle;
  onChange: (value: Toggle) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as Toggle)} className={inputClass}>
        <option value="">Don&apos;t change</option>
        <option value="yes">{yes}</option>
        <option value="no">{no}</option>
      </select>
    </div>
  );
}

// Applies the filled-in settings to every selected variant; empty fields stay unchanged.
export function BulkEditModal({
  count,
  currencyCode,
  onClose,
  onApply,
}: {
  count: number;
  currencyCode: string;
  onClose: () => void;
  onApply: (patch: Partial<VariantDraft>) => void;
}) {
  const symbol = currencySymbol(currencyCode);
  const [values, setValues] = useState({
    price: "",
    compareAtPrice: "",
    costPerItem: "",
    inventoryQuantity: "",
    weight: "",
    weightUnit: "" as WeightUnit | "",
  });
  const [toggles, setToggles] = useState<Record<"taxable" | "trackInventory" | "continueSelling" | "requiresShipping", Toggle>>({
    taxable: "",
    trackInventory: "",
    continueSelling: "",
    requiresShipping: "",
  });

  const apply = () => {
    const patch: Partial<VariantDraft> = {};
    if (values.price.trim()) patch.price = values.price.trim();
    if (values.compareAtPrice.trim()) patch.compareAtPrice = values.compareAtPrice.trim();
    if (values.costPerItem.trim()) patch.costPerItem = values.costPerItem.trim();
    if (values.inventoryQuantity.trim()) patch.inventoryQuantity = values.inventoryQuantity.trim();
    if (values.weight.trim()) patch.weight = values.weight.trim();
    if (values.weightUnit) patch.weightUnit = values.weightUnit;
    for (const [key, value] of Object.entries(toggles) as [keyof typeof toggles, Toggle][]) {
      if (value) patch[key] = value === "yes";
    }
    onApply(patch);
  };

  const setValue = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const setToggle = (key: keyof typeof toggles) => (value: Toggle) => setToggles((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      title={`Edit ${count} ${count === 1 ? "variant" : "variants"}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={apply} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Apply to selected
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-zinc-600">Fill in only what you want to change. Empty fields stay as they are.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField id="bulk-price" label="Price" prefix={symbol} inputMode="decimal" placeholder="0.00" value={values.price} onChange={setValue("price")} />
        <TextField id="bulk-compare" label="Compare-at price" prefix={symbol} inputMode="decimal" placeholder="0.00" value={values.compareAtPrice} onChange={setValue("compareAtPrice")} />
        <TextField id="bulk-cost" label="Cost per item" prefix={symbol} inputMode="decimal" placeholder="0.00" value={values.costPerItem} onChange={setValue("costPerItem")} />
        <TextField id="bulk-quantity" label="Quantity available" inputMode="numeric" placeholder="0" value={values.inventoryQuantity} onChange={setValue("inventoryQuantity")} />
        <TextField id="bulk-weight" label="Weight" inputMode="decimal" placeholder="0.0" value={values.weight} onChange={setValue("weight")} />
        <div>
          <label htmlFor="bulk-weight-unit" className={labelClass}>
            Weight unit
          </label>
          <select id="bulk-weight-unit" value={values.weightUnit} onChange={(event) => setValue("weightUnit")(event.target.value)} className={inputClass}>
            <option value="">Don&apos;t change</option>
            {WEIGHT_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <ToggleSelect id="bulk-taxable" label="Charge tax" yes="Charge tax" no="Don't charge tax" value={toggles.taxable} onChange={setToggle("taxable")} />
        <ToggleSelect id="bulk-track" label="Track quantity" yes="Track quantity" no="Don't track" value={toggles.trackInventory} onChange={setToggle("trackInventory")} />
        <ToggleSelect id="bulk-continue" label="When out of stock" yes="Continue selling" no="Stop selling" value={toggles.continueSelling} onChange={setToggle("continueSelling")} />
        <ToggleSelect id="bulk-shipping" label="Physical product" yes="Physical product" no="Not physical" value={toggles.requiresShipping} onChange={setToggle("requiresShipping")} />
      </div>
    </Modal>
  );
}
