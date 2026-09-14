// Product editor data shared by the browser editor and the server. No server-only imports.

export type ProductOption = { name: string; values: string[] };

export type VariantDraft = {
  optionValues: Record<string, string>;
  price: string;
  compareAtPrice: string;
  sku: string;
  barcode: string;
  inventoryQuantity: string;
};

export type ProductDraft = {
  title: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
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
  price: string | null;
  compareAtPrice: string | null;
  sku: string | null;
  barcode: string | null;
  inventoryQuantity: number | null;
};

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;
export const MAX_IMAGES = 20;

export function emptyVariant(optionValues: Record<string, string> = {}): VariantDraft {
  return { optionValues, price: "", compareAtPrice: "", sku: "", barcode: "", inventoryQuantity: "" };
}

export function emptyDraft(): ProductDraft {
  return {
    title: "",
    descriptionHtml: "",
    productType: "",
    tags: [],
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
function optionKey(option: ProductOption, index: number) {
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

// Rebuilds the variant list after the options change, keeping values the vendor already entered.
export function syncVariants(
  previousOptions: ProductOption[],
  previousVariants: VariantDraft[],
  nextOptions: ProductOption[],
): VariantDraft[] {
  const existing = new Map(
    previousVariants.map((variant) => [variantLabel(variant.optionValues, previousOptions), variant]),
  );
  const template = previousVariants[0] ?? emptyVariant();

  return variantCombinations(nextOptions).map((combo) => {
    const match = existing.get(variantLabel(combo, nextOptions));
    return match
      ? { ...match, optionValues: combo }
      : { ...emptyVariant(combo), price: template.price, compareAtPrice: template.compareAtPrice };
  });
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

// Also converts submissions saved by the first, single-variant version of the form.
export function draftFromSubmission(submission: SubmissionRecord): ProductDraft {
  const options = Array.isArray(submission.options) ? (submission.options as ProductOption[]) : [];
  const stored = Array.isArray(submission.variants) ? (submission.variants as StoredVariant[]) : [];

  const variants: VariantDraft[] = stored.length
    ? stored.map((variant) => ({
        optionValues: variant.optionValues ?? {},
        price: variant.price ?? "",
        compareAtPrice: variant.compareAtPrice ?? "",
        sku: variant.sku ?? "",
        barcode: variant.barcode ?? "",
        inventoryQuantity: variant.inventoryQuantity === null ? "" : String(variant.inventoryQuantity),
      }))
    : [
        {
          optionValues: {},
          price: submission.price?.toFixed(2) ?? "",
          compareAtPrice: submission.compareAtPrice?.toFixed(2) ?? "",
          sku: submission.sku ?? "",
          barcode: submission.barcode ?? "",
          inventoryQuantity: submission.inventoryQuantity?.toString() ?? "",
        },
      ];

  return {
    title: submission.title,
    descriptionHtml: submission.descriptionHtml ?? plainTextToHtml(submission.description),
    productType: submission.productType ?? "",
    tags: submission.tags,
    trackInventory: submission.trackInventory,
    options,
    variants,
    imageUrls: submission.imageUrls,
    seoTitle: submission.seoTitle ?? "",
    seoDescription: submission.seoDescription ?? "",
    handle: submission.handle ?? "",
  };
}
