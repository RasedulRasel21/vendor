// Product editor data shared by the browser editor and the server. No server-only imports.

export type ProductOption = { name: string; values: string[] };

export type WeightUnit = "KILOGRAMS" | "GRAMS" | "POUNDS" | "OUNCES";

export const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: "KILOGRAMS", label: "kg" },
  { value: "GRAMS", label: "g" },
  { value: "POUNDS", label: "lb" },
  { value: "OUNCES", label: "oz" },
];

// Every per-variant setting Shopify has, as editable strings and flags.
export type VariantDraft = {
  optionValues: Record<string, string>;
  imageUrl: string;
  price: string;
  compareAtPrice: string;
  costPerItem: string;
  taxable: boolean;
  sku: string;
  barcode: string;
  trackInventory: boolean;
  inventoryQuantity: string;
  continueSelling: boolean;
  requiresShipping: boolean;
  weight: string;
  weightUnit: WeightUnit;
  countryOfOrigin: string;
  hsCode: string;
};

export type ProductDraft = {
  title: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  // Shopify GIDs of the store's manual collections the product should be added to.
  collectionIds: string[];
  // Kept for older submissions; each variant now has its own trackInventory.
  trackInventory: boolean;
  options: ProductOption[];
  variants: VariantDraft[];
  imageUrls: string[];
  seoTitle: string;
  seoDescription: string;
  handle: string;
};

// How variants are stored in the database and read by the Shopify app.
export type StoredVariant = {
  optionValues: Record<string, string>;
  imageUrl: string | null;
  price: string | null;
  compareAtPrice: string | null;
  costPerItem: string | null;
  taxable: boolean;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  inventoryQuantity: number | null;
  continueSelling: boolean;
  requiresShipping: boolean;
  weight: string | null;
  weightUnit: WeightUnit;
  countryOfOrigin: string | null;
  hsCode: string | null;
};

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;
export const MAX_IMAGES = 20;

export function emptyVariant(
  optionValues: Record<string, string> = {},
  defaults: Partial<VariantDraft> = {},
): VariantDraft {
  return {
    imageUrl: "",
    price: "",
    compareAtPrice: "",
    costPerItem: "",
    taxable: true,
    sku: "",
    barcode: "",
    trackInventory: true,
    inventoryQuantity: "",
    continueSelling: false,
    requiresShipping: true,
    weight: "",
    weightUnit: "KILOGRAMS",
    countryOfOrigin: "",
    hsCode: "",
    ...defaults,
    optionValues,
  };
}

export function emptyDraft(): ProductDraft {
  return {
    title: "",
    descriptionHtml: "",
    productType: "",
    tags: [],
    collectionIds: [],
    trackInventory: true,
    options: [],
    variants: [emptyVariant()],
    imageUrls: [],
    seoTitle: "",
    seoDescription: "",
    handle: "",
  };
}

// While a name is still empty, its position stands in, so renaming never reshuffles variants.
export function optionKey(option: ProductOption, index: number) {
  return option.name.trim() || `Option ${index + 1}`;
}

export function hasVariantOptions(options: ProductOption[]) {
  return options.some((option) => option.values.length > 0);
}

// Every combination of option values; a product without options has one default variant.
export function variantCombinations(options: ProductOption[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (combos, option, index) =>
      option.values.length
        ? combos.flatMap((combo) =>
            option.values.map((value) => ({ ...combo, [optionKey(option, index)]: value })),
          )
        : combos,
    [{}],
  );
}

export function variantLabel(optionValues: Record<string, string>, options: ProductOption[]) {
  return options
    .map((option, index) => (option.values.length ? optionValues[optionKey(option, index)] ?? "" : null))
    .filter((value): value is string => value !== null)
    .join(" / ");
}

// Identifies a variant by its option values regardless of option order, so reordering
// or renaming options keeps each variant's settings.
export function variantKey(optionValues: Record<string, string>, options: ProductOption[]) {
  const pairs = options
    .map((option, index) => {
      if (!option.values.length) return null;
      const key = optionKey(option, index);
      return [key, optionValues[key] ?? ""];
    })
    .filter((pair): pair is string[] => pair !== null)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(pairs);
}

// Settings a new variant copies from an existing one, like Shopify does when adding values.
function sharedSettings(variant: VariantDraft): Partial<VariantDraft> {
  return {
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    costPerItem: variant.costPerItem,
    taxable: variant.taxable,
    trackInventory: variant.trackInventory,
    continueSelling: variant.continueSelling,
    requiresShipping: variant.requiresShipping,
    weight: variant.weight,
    weightUnit: variant.weightUnit,
    countryOfOrigin: variant.countryOfOrigin,
    hsCode: variant.hsCode,
  };
}

// Rebuilds variants after the options change: keeps existing variants and their settings,
// adds variants only for new combinations, and keeps removed variants removed.
export function syncVariants(
  previousOptions: ProductOption[],
  previousVariants: VariantDraft[],
  nextOptions: ProductOption[],
): VariantDraft[] {
  const existing = new Map(
    previousVariants.map((variant) => [variantKey(variant.optionValues, previousOptions), variant]),
  );
  const previousKeys = new Set(
    variantCombinations(previousOptions).map((combo) => variantKey(combo, previousOptions)),
  );
  const defaults = previousVariants[0] ? sharedSettings(previousVariants[0]) : {};
  const combinations = variantCombinations(nextOptions);

  const next = combinations.flatMap((combo) => {
    const key = variantKey(combo, nextOptions);
    const match = existing.get(key);
    if (match) return [{ ...match, optionValues: combo }];
    if (previousKeys.has(key)) return [];
    return [emptyVariant(combo, defaults)];
  });

  return next.length ? next : [emptyVariant(combinations[0] ?? {}, defaults)];
}

export type VariantGroup = { value: string; items: { variant: VariantDraft; index: number }[] };

// With two or more options, Shopify groups the variants table by the first option.
export function groupVariants(variants: VariantDraft[], options: ProductOption[]): VariantGroup[] | null {
  const usable = options.map((option, index) => ({ option, index })).filter(({ option }) => option.values.length);
  if (usable.length < 2) return null;

  const first = usable[0];
  const key = optionKey(first.option, first.index);

  return first.option.values
    .map((value) => ({
      value,
      items: variants
        .map((variant, index) => ({ variant, index }))
        .filter(({ variant }) => variant.optionValues[key] === value),
    }))
    .filter((group) => group.items.length);
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainTextToHtml(text: string | null) {
  if (!text) return "";
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => `<p>${escape(paragraph.trim()).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

type Amount = { toFixed(digits: number): string } | null;

export type SubmissionRecord = {
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  productType: string | null;
  tags: string[];
  collectionIds: string[];
  trackInventory: boolean;
  options: unknown;
  variants: unknown;
  imageUrls: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  handle: string | null;
  price: Amount;
  compareAtPrice: Amount;
  sku: string | null;
  barcode: string | null;
  inventoryQuantity: number | null;
};

// Also converts submissions saved by earlier versions of the editor, filling in Shopify defaults.
export function draftFromSubmission(submission: SubmissionRecord): ProductDraft {
  const options = Array.isArray(submission.options) ? (submission.options as ProductOption[]) : [];
  const stored = Array.isArray(submission.variants) ? (submission.variants as Partial<StoredVariant>[]) : [];

  const variants: VariantDraft[] = stored.length
    ? stored.map((variant) =>
        emptyVariant(variant.optionValues ?? {}, {
          imageUrl: variant.imageUrl ?? "",
          price: variant.price ?? "",
          compareAtPrice: variant.compareAtPrice ?? "",
          costPerItem: variant.costPerItem ?? "",
          taxable: variant.taxable ?? true,
          sku: variant.sku ?? "",
          barcode: variant.barcode ?? "",
          trackInventory: variant.trackInventory ?? submission.trackInventory,
          inventoryQuantity:
            variant.inventoryQuantity === null || variant.inventoryQuantity === undefined
              ? ""
              : String(variant.inventoryQuantity),
          continueSelling: variant.continueSelling ?? false,
          requiresShipping: variant.requiresShipping ?? true,
          weight: variant.weight ?? "",
          weightUnit: variant.weightUnit ?? "KILOGRAMS",
          countryOfOrigin: variant.countryOfOrigin ?? "",
          hsCode: variant.hsCode ?? "",
        }),
      )
    : [
        emptyVariant({}, {
          price: submission.price?.toFixed(2) ?? "",
          compareAtPrice: submission.compareAtPrice?.toFixed(2) ?? "",
          sku: submission.sku ?? "",
          barcode: submission.barcode ?? "",
          trackInventory: submission.trackInventory,
          inventoryQuantity: submission.inventoryQuantity?.toString() ?? "",
        }),
      ];

  return {
    title: submission.title,
    descriptionHtml: submission.descriptionHtml ?? plainTextToHtml(submission.description),
    productType: submission.productType ?? "",
    tags: submission.tags,
    collectionIds: submission.collectionIds,
    trackInventory: submission.trackInventory,
    options,
    variants,
    imageUrls: submission.imageUrls,
    seoTitle: submission.seoTitle ?? "",
    seoDescription: submission.seoDescription ?? "",
    handle: submission.handle ?? "",
  };
}
