import type { ProductDraft } from "@/lib/product-draft";

// The arithmetic behind changing the price or the stock of several products at once.
// Kept apart from the server action so it can be read, and tested, on its own.

export type Change = {
  mode: "set" | "up" | "down";
  // Only meaningful for a price: stock is always a number of items.
  unit: "amount" | "percent";
  value: number;
};

export function nextPrice(current: string | null, change: Change) {
  if (change.mode === "set") return change.value.toFixed(2);

  // Nothing to raise or lower: a variant with no price is left alone rather than being
  // given one out of nowhere.
  if (!current) return current;

  const now = Number(current);
  if (!Number.isFinite(now)) return current;

  const step = change.unit === "percent" ? (now * change.value) / 100 : change.value;
  const next = change.mode === "up" ? now + step : now - step;

  // Never below zero: "20% off" on a free sample shouldn't owe the customer money.
  return Math.max(0, Math.round(next * 100) / 100).toFixed(2);
}

export function nextStock(current: string, change: Change) {
  const value = Math.round(change.value);
  if (change.mode === "set") return String(Math.max(0, value));

  const now = Number(current || "0");
  const base = Number.isFinite(now) ? now : 0;
  return String(Math.max(0, change.mode === "up" ? base + value : base - value));
}

/**
 * The same change applied to every variant of one product. Stock is only touched on
 * variants that track it; the rest sell whatever the count says, so a number there would
 * mean nothing.
 */
export function applyChange(draft: ProductDraft, field: "price" | "stock", change: Change): ProductDraft {
  return {
    ...draft,
    variants: draft.variants.map((variant) =>
      field === "price"
        ? { ...variant, price: nextPrice(variant.price || null, change) ?? variant.price }
        : variant.trackInventory
          ? { ...variant, inventoryQuantity: nextStock(variant.inventoryQuantity, change) }
          : variant,
    ),
  };
}
