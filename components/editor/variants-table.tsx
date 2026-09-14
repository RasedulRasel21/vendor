"use client";

import { useMemo, useState } from "react";
import { currencySymbol } from "@/lib/money";
import {
  groupVariants,
  variantLabel,
  type ProductOption,
  type VariantDraft,
} from "@/lib/product-draft";
import { secondaryButtonClass } from "@/lib/ui";

type Props = {
  options: ProductOption[];
  variants: VariantDraft[];
  currencyCode: string;
  errors: Record<string, string>;
  onPatch: (indices: number[], patch: Partial<VariantDraft>) => void;
  onDelete: (indices: number[]) => void;
  onEdit: (index: number) => void;
  onPickImage: (index: number) => void;
  onBulkEdit: (indices: number[]) => void;
};

const cellInput =
  "w-full rounded-lg border border-zinc-300 bg-white py-1.5 pr-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-500";

function Thumb({ url, onClick, label }: { url: string; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Change image for ${label}`}
      className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-500 hover:text-zinc-700"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="text-lg">⊞</span>
      )}
    </button>
  );
}

export function VariantsTable({
  options,
  variants,
  currencyCode,
  errors,
  onPatch,
  onDelete,
  onEdit,
  onPickImage,
  onBulkEdit,
}: Props) {
  const symbol = currencySymbol(currencyCode);
  const [selected, setSelected] = useState<number[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const term = query.trim().toLowerCase();
  const matches = (index: number) =>
    !term || variantLabel(variants[index].optionValues, options).toLowerCase().includes(term);

  const groups = useMemo(() => groupVariants(variants, options), [variants, options]);
  const visibleIndices = variants.map((_, index) => index).filter(matches);
  const validSelected = selected.filter((index) => index < variants.length);
  const allSelected = visibleIndices.length > 0 && visibleIndices.every((index) => validSelected.includes(index));

  const toggle = (indices: number[], on: boolean) =>
    setSelected((current) =>
      on ? [...new Set([...current, ...indices])] : current.filter((index) => !indices.includes(index)),
    );

  const totalAvailable = variants.reduce(
    (sum, variant) => sum + (variant.trackInventory ? Number(variant.inventoryQuantity) || 0 : 0),
    0,
  );

  const priceInput = (index: number, label: string) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-zinc-500">{symbol}</span>
      <input
        aria-label={`${label} price`}
        inputMode="decimal"
        placeholder="0.00"
        value={variants[index].price}
        onChange={(event) => onPatch([index], { price: event.target.value })}
        aria-invalid={Boolean(errors[`variants.${index}.price`])}
        className={`${cellInput} pl-7`}
      />
    </div>
  );

  const availableCell = (index: number, label: string) =>
    variants[index].trackInventory ? (
      <input
        aria-label={`${label} available`}
        inputMode="numeric"
        placeholder="0"
        value={variants[index].inventoryQuantity}
        onChange={(event) => onPatch([index], { inventoryQuantity: event.target.value })}
        aria-invalid={Boolean(errors[`variants.${index}.inventoryQuantity`])}
        className={`${cellInput} pl-2`}
      />
    ) : (
      <span className="text-sm text-zinc-500">Not tracked</span>
    );

  const variantRow = (index: number, nested: boolean) => {
    const variant = variants[index];
    const label = variantLabel(variant.optionValues, options);
    const rowErrors = Object.entries(errors)
      .filter(([key]) => key.startsWith(`variants.${index}.`))
      .map(([, message]) => message);

    return (
      <tr key={index} className="border-t border-zinc-100 align-middle hover:bg-zinc-50/60">
        <td className="w-10 px-3 py-2">
          <input
            type="checkbox"
            aria-label={`Select ${label}`}
            checked={validSelected.includes(index)}
            onChange={(event) => toggle([index], event.target.checked)}
            className="size-4 accent-zinc-900"
          />
        </td>
        <td className={`py-2 pr-3 ${nested ? "pl-8" : ""}`}>
          <div className="flex items-center gap-3">
            <Thumb url={variant.imageUrl} label={label} onClick={() => onPickImage(index)} />
            <div className="min-w-0">
              <button type="button" onClick={() => onEdit(index)} className="truncate text-left text-sm font-medium text-zinc-900 hover:underline">
                {nested ? label.split(" / ").slice(1).join(" / ") : label}
              </button>
              {rowErrors.length > 0 && (
                <p className="text-xs text-red-700">
                  {rowErrors[0]}
                  {rowErrors.length > 1 ? ` (+${rowErrors.length - 1} more)` : ""}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="w-40 px-2 py-2">{priceInput(index, label)}</td>
        <td className="w-32 px-2 py-2">{availableCell(index, label)}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {validSelected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-800">{`${validSelected.length} selected`}</span>
            <button type="button" onClick={() => onBulkEdit(validSelected)} className={secondaryButtonClass}>
              Bulk edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (validSelected.length >= variants.length) return;
                onDelete(validSelected);
                setSelected([]);
              }}
              disabled={validSelected.length >= variants.length}
              title={validSelected.length >= variants.length ? "A product needs at least one variant" : undefined}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              Delete variants
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {searchOpen && (
            <input
              type="search"
              aria-label="Search variants"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Search variants"
              className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
            />
          )}
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search variants"}
            onClick={() => {
              setSearchOpen(!searchOpen);
              setQuery("");
            }}
            className={`${secondaryButtonClass} px-2.5 py-1.5`}
          >
            {searchOpen ? "✕" : "⌕"}
          </button>
        </div>
      </div>

      {errors.variants && <p className="text-sm text-red-700">{errors.variants}</p>}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all variants"
                  checked={allSelected}
                  onChange={(event) => toggle(visibleIndices, event.target.checked)}
                  className="size-4 accent-zinc-900"
                />
              </th>
              <th className="py-2 pr-3 font-medium">Variant</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {groups
              ? groups.map((group) => {
                  const indices = group.items.map((item) => item.index).filter(matches);
                  if (!indices.length) return null;
                  const isCollapsed = collapsed.includes(group.value) && !term;
                  const prices = indices.map((index) => variants[index].price.trim()).filter(Boolean);
                  const samePrice = prices.length === indices.length && new Set(prices).size === 1 ? prices[0] : "";
                  const numeric = prices.map(Number).filter((value) => !Number.isNaN(value));
                  const range = numeric.length ? `${Math.min(...numeric).toFixed(2)} – ${Math.max(...numeric).toFixed(2)}` : "0.00";
                  const available = indices.reduce(
                    (sum, index) => sum + (variants[index].trackInventory ? Number(variants[index].inventoryQuantity) || 0 : 0),
                    0,
                  );
                  const groupSelected = indices.every((index) => validSelected.includes(index));
                  const firstImage = indices.map((index) => variants[index].imageUrl).find(Boolean) ?? "";

                  return [
                    <tr key={`group-${group.value}`} className="border-t border-zinc-200 bg-white align-middle">
                      <td className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select all ${group.value} variants`}
                          checked={groupSelected}
                          onChange={(event) => toggle(indices, event.target.checked)}
                          className="size-4 accent-zinc-900"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-3">
                          <Thumb url={firstImage} label={group.value} onClick={() => onPickImage(indices[0])} />
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{group.value}</p>
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsed((current) =>
                                  current.includes(group.value)
                                    ? current.filter((value) => value !== group.value)
                                    : [...current, group.value],
                                )
                              }
                              className="text-xs text-zinc-600 hover:underline"
                            >
                              {`${indices.length} ${indices.length === 1 ? "variant" : "variants"} ${isCollapsed ? "▸" : "▾"}`}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="w-40 px-2 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-zinc-500">{symbol}</span>
                          <input
                            aria-label={`Price for all ${group.value} variants`}
                            inputMode="decimal"
                            value={samePrice}
                            placeholder={samePrice ? "0.00" : range}
                            onChange={(event) => onPatch(indices, { price: event.target.value })}
                            className={`${cellInput} pl-7`}
                          />
                        </div>
                      </td>
                      <td className="w-32 px-2 py-2 text-sm tabular-nums text-zinc-700">{available}</td>
                    </tr>,
                    ...(isCollapsed ? [] : indices.map((index) => variantRow(index, true))),
                  ];
                })
              : visibleIndices.map((index) => variantRow(index, false))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-600">{`Total inventory: ${totalAvailable} available`}</p>
    </div>
  );
}
