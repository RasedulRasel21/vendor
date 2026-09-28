"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { ProductThumb } from "@/components/portal/product-thumb";
import { StatusBadge } from "@/components/status-badge";
import type { SubmissionStatus } from "@/lib/product-status";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { bulkEdit, type BulkState } from "./bulk-actions";

export type ProductRow = {
  id: string;
  title: string;
  status: SubmissionStatus;
  imageUrl: string | null;
  variantCount: number;
  price: string;
  updatedAt: string;
  pendingChanges: boolean;
};

const initialState: BulkState = {};

// The list, with the option of doing something to several products at once. Ticking is
// the only thing that changes about the table itself: one product at a time is still the
// normal way to work, and the bar only appears when it has something to act on.
export function ProductTable({ rows, currencyCode }: { rows: ProductRow[]; currencyCode: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction, working] = useActionState(bulkEdit, initialState);
  const [action, setAction] = useState<"price" | "stock">("price");
  const [mode, setMode] = useState<"set" | "up" | "down">("set");
  const [unit, setUnit] = useState<"amount" | "percent">("amount");

  const allTicked = rows.length > 0 && selected.length === rows.length;
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <>
      {(state.done || state.error) && !working && (
        <p
          role="status"
          className={`border-b px-4 py-3 text-sm ${
            state.error ? "border-red-100 bg-red-50 text-red-800" : "border-primary-100 bg-primary-50 text-primary-800"
          }`}
        >
          {state.error ?? state.done}
        </p>
      )}

      {selected.length > 0 && (
        <form action={formAction} className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          {selected.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 pb-2 text-sm font-medium text-zinc-900">
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
                aria-label="Clear the selection"
              >
                <X className="size-4" />
              </button>
              {selected.length} selected
            </div>

            <label className="sr-only" htmlFor="bulk-action">
              What to change
            </label>
            <select
              id="bulk-action"
              name="field"
              value={action}
              onChange={(event) => setAction(event.target.value as "price" | "stock")}
              className={`${inputClass} w-auto`}
            >
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </select>

            <label className="sr-only" htmlFor="bulk-mode">
              How to change it
            </label>
            <select
              id="bulk-mode"
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as "set" | "up" | "down")}
              className={`${inputClass} w-auto`}
            >
              <option value="set">set to</option>
              <option value="up">increase by</option>
              <option value="down">decrease by</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="bulk-value">
                Amount
              </label>
              <input
                id="bulk-value"
                name="value"
                inputMode="decimal"
                required
                placeholder={action === "price" ? "0.00" : "0"}
                className={`${inputClass} w-28`}
              />
              {action === "price" &&
                (mode === "set" ? (
                  <span className="text-sm text-zinc-500">{currencyCode}</span>
                ) : (
                  <select
                    name="unit"
                    aria-label="Amount or percent"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as "amount" | "percent")}
                    className={`${inputClass} w-auto`}
                  >
                    <option value="amount">{currencyCode}</option>
                    <option value="percent">%</option>
                  </select>
                ))}
            </div>

            <button
              type="submit"
              name="action"
              value="edit"
              disabled={working}
              className={primaryButtonClass}
            >
              {working ? "Changing…" : "Apply"}
            </button>

            <button
              type="submit"
              name="action"
              value="delete"
              disabled={working}
              formNoValidate
              onClick={(event) => {
                // Drafts are gone for good, and it is a lot to lose by mis-clicking.
                const many = selected.length === 1 ? "this product" : `these ${selected.length} products`;
                if (!window.confirm(`Delete ${many}? Drafts can't be got back.`)) event.preventDefault();
              }}
              className={`${secondaryButtonClass} ml-auto text-red-700`}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            Products already on sale go to the store for approval; drafts change straight away.
          </p>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th scope="col" className="w-10 py-3 pl-6 pr-0">
                <input
                  type="checkbox"
                  checked={allTicked}
                  onChange={() => setSelected(allTicked ? [] : rows.map((row) => row.id))}
                  aria-label={allTicked ? "Clear the selection" : "Select every product listed"}
                  className="size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Product
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ticked = selected.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={`group border-t border-zinc-100 transition ${ticked ? "bg-primary-50/60" : "hover:bg-zinc-50"}`}
                >
                  <td className="py-3 pl-6 pr-0">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.title}`}
                      className="size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/products/${row.id}`} className="flex items-center gap-3">
                      <ProductThumb src={row.imageUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900 group-hover:underline">
                          {row.title}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {row.variantCount} {row.variantCount === 1 ? "variant" : "variants"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                    {row.pendingChanges && (
                      <span className="mt-1 block text-xs text-amber-700">Changes pending</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-800">{row.price}</td>
                  <td className="px-6 py-3 text-right text-zinc-500">{row.updatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
