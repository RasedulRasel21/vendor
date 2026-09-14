import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import {
  MAX_IMAGES,
  MAX_OPTIONS,
  MAX_VARIANTS,
  variantCombinations,
  variantKey,
  type ProductDraft,
  type ProductOption,
  type StoredVariant,
} from "@/lib/product-draft";
import { sanitizeDescription } from "@/lib/sanitize";

export type ProductErrors = Record<string, string>;

export type ProductData = {
  title: string;
  descriptionHtml: string | null;
  productType: string | null;
  tags: string[];
  collectionIds: string[];
  trackInventory: boolean;
  options: ProductOption[];
  variants: StoredVariant[];
  imageUrls: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  handle: string | null;
  // Summary columns used by product lists: lowest price, and single-variant details.
  price: string | null;
  compareAtPrice: string | null;
  sku: string | null;
  barcode: string | null;
  inventoryQuantity: number | null;
};

const text = (max: number) => z.string().max(max);

const draftSchema = z.object({
  title: text(2000),
  descriptionHtml: text(200000),
  productType: text(2000),
  tags: z.array(text(2000)).max(1000),
  collectionIds: z.array(text(200)).max(1000),
  trackInventory: z.boolean(),
  options: z.array(z.object({ name: text(2000), values: z.array(text(2000)).max(1000) })).max(20),
  variants: z
    .array(
      z.object({
        optionValues: z.record(z.string(), z.string()),
        imageUrl: text(5000),
        price: text(100),
        compareAtPrice: text(100),
        costPerItem: text(100),
        taxable: z.boolean(),
        sku: text(2000),
        barcode: text(2000),
        trackInventory: z.boolean(),
        inventoryQuantity: text(100),
        continueSelling: z.boolean(),
        requiresShipping: z.boolean(),
        weight: text(100),
        weightUnit: z.enum(["KILOGRAMS", "GRAMS", "POUNDS", "OUNCES"]),
        countryOfOrigin: text(10),
        hsCode: text(100),
      }),
    )
    .max(5000),
  imageUrls: z.array(text(5000)).max(200),
  seoTitle: text(2000),
  seoDescription: text(5000),
  handle: text(2000),
});

const MAX_COLLECTIONS = 250;
const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,7}$/;
const WEIGHT = /^\d{1,7}(\.\d{1,3})?$/;
const HS_CODE = /^\d{6,13}$/;
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const unique = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function parseProductPayload(payload: string): ProductDraft | null {
  try {
    const result = draftSchema.safeParse(JSON.parse(payload));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Drafts can be incomplete; submitting for approval also needs prices and tracked quantities.
// Error keys match editor fields, for example "variants.2.price".
export function validateProduct(
  draft: ProductDraft,
  { forSubmit }: { forSubmit: boolean },
): { errors: ProductErrors } | { data: ProductData } {
  const errors: ProductErrors = {};

  const title = draft.title.trim();
  if (!title) errors.title = "Enter a product title";
  else if (title.length > 255) errors.title = "Use 255 characters or fewer";

  const descriptionHtml = sanitizeDescription(draft.descriptionHtml);
  if (descriptionHtml.length > 50000) errors.descriptionHtml = "Keep the description shorter";

  const productType = draft.productType.trim();
  if (productType.length > 255) errors.productType = "Use 255 characters or fewer";

  const tags = unique(draft.tags.map((tag) => tag.trim()).filter(Boolean));
  if (tags.length > 250) errors.tags = "Use up to 250 tags";
  else if (tags.some((tag) => tag.length > 255)) errors.tags = "Keep each tag to 255 characters or fewer";

  // Whether each collection still exists in the store is checked when saving.
  const collectionIds = [...new Set(draft.collectionIds)].filter((id) => id.startsWith("gid://shopify/Collection/"));
  if (collectionIds.length > MAX_COLLECTIONS) errors.collectionIds = `Add the product to up to ${MAX_COLLECTIONS} collections`;

  const imageUrls = unique(draft.imageUrls.map((url) => url.trim()).filter(Boolean));
  if (imageUrls.length > MAX_IMAGES) errors.imageUrls = `Add up to ${MAX_IMAGES} images`;
  else if (imageUrls.some((url) => !isHttpsUrl(url))) errors.imageUrls = "Each image link must start with https://";

  if (draft.options.length > MAX_OPTIONS) errors.options = `Add up to ${MAX_OPTIONS} options`;

  const options: ProductOption[] = draft.options.map((option, index) => {
    const name = option.name.trim();
    const values = unique(option.values.map((value) => value.trim()).filter(Boolean));
    const isDuplicate =
      draft.options.findIndex((other) => other.name.trim().toLowerCase() === name.toLowerCase()) !== index;

    if (!name) errors[`options.${index}.name`] = "Enter an option name";
    else if (name.length > 255) errors[`options.${index}.name`] = "Use 255 characters or fewer";
    else if (isDuplicate) errors[`options.${index}.name`] = "Each option needs a different name";

    if (!values.length) errors[`options.${index}.values`] = "Add at least one value";
    else if (values.some((value) => value.length > 255)) {
      errors[`options.${index}.values`] = "Keep each value to 255 characters or fewer";
    }

    return { name, values };
  });

  const combinations = new Map(
    variantCombinations(options).map((combination) => [variantKey(combination, options), combination]),
  );
  const seenKeys = new Set<string>();
  const variants: StoredVariant[] = [];

  draft.variants.forEach((input, index) => {
    const matchKey = variantKey(input.optionValues, draft.options);
    const combination = combinations.get(matchKey);
    if (!combination || seenKeys.has(matchKey)) {
      errors.variants ??= "Some variants don't match the options. Check the variants list.";
      return;
    }
    seenKeys.add(matchKey);

    const key = `variants.${index}`;
    const price = input.price.trim();
    const compareAtPrice = input.compareAtPrice.trim();
    const costPerItem = input.costPerItem.trim();
    const quantity = input.inventoryQuantity.trim();
    const weight = input.weight.trim();
    const hsCode = input.hsCode.replace(/[\s.]/g, "");
    const countryOfOrigin = input.countryOfOrigin.trim().toUpperCase();
    const sku = input.sku.trim();
    const barcode = input.barcode.trim();
    const imageUrl = input.imageUrl.trim();

    if (price && !AMOUNT.test(price)) errors[`${key}.price`] = "Enter a price like 19.99";
    else if (!price && forSubmit) errors[`${key}.price`] = "Enter a price";

    if (compareAtPrice && !AMOUNT.test(compareAtPrice)) {
      errors[`${key}.compareAtPrice`] = "Enter an amount like 24.99";
    } else if (compareAtPrice && AMOUNT.test(price) && Number(compareAtPrice) <= Number(price)) {
      errors[`${key}.compareAtPrice`] = "Must be higher than the price";
    }

    if (costPerItem && !AMOUNT.test(costPerItem)) errors[`${key}.costPerItem`] = "Enter an amount like 8.50";

    if (input.trackInventory) {
      if (quantity && !QUANTITY.test(quantity)) errors[`${key}.inventoryQuantity`] = "Enter a whole number";
      else if (!quantity && forSubmit) errors[`${key}.inventoryQuantity`] = "Enter the quantity available";
    }

    if (sku.length > 255) errors[`${key}.sku`] = "Use 255 characters or fewer";
    if (barcode.length > 255) errors[`${key}.barcode`] = "Use 255 characters or fewer";

    if (input.requiresShipping && weight && !WEIGHT.test(weight)) {
      errors[`${key}.weight`] = "Enter a weight like 0.5";
    }
    if (countryOfOrigin && !COUNTRY_CODES.includes(countryOfOrigin)) {
      errors[`${key}.countryOfOrigin`] = "Choose a country from the list";
    }
    if (hsCode && !HS_CODE.test(hsCode)) errors[`${key}.hsCode`] = "Enter a 6 to 13 digit HS code";

    if (imageUrl && !imageUrls.includes(imageUrl)) {
      errors[`${key}.imageUrl`] = "Choose the variant image from this product's images";
    }

    variants.push({
      optionValues: combination,
      imageUrl: imageUrl || null,
      price: AMOUNT.test(price) ? Number(price).toFixed(2) : null,
      compareAtPrice: AMOUNT.test(compareAtPrice) ? Number(compareAtPrice).toFixed(2) : null,
      costPerItem: AMOUNT.test(costPerItem) ? Number(costPerItem).toFixed(2) : null,
      taxable: input.taxable,
      sku: sku || null,
      barcode: barcode || null,
      trackInventory: input.trackInventory,
      inventoryQuantity: input.trackInventory && QUANTITY.test(quantity) ? Number(quantity) : null,
      continueSelling: input.continueSelling,
      requiresShipping: input.requiresShipping,
      weight: input.requiresShipping && WEIGHT.test(weight) ? weight : null,
      weightUnit: input.weightUnit,
      countryOfOrigin: countryOfOrigin || null,
      hsCode: hsCode || null,
    });
  });

  if (!draft.variants.length && !errors.variants) errors.variants = "Add at least one variant";
  if (combinations.size > MAX_VARIANTS) errors.variants = `Products can have up to ${MAX_VARIANTS} variants`;

  const seoTitle = draft.seoTitle.trim();
  const seoDescription = draft.seoDescription.trim();
  const handle = draft.handle.trim().toLowerCase();
  if (seoTitle.length > 70) errors.seoTitle = "Use 70 characters or fewer";
  if (seoDescription.length > 320) errors.seoDescription = "Use 320 characters or fewer";
  if (handle && !HANDLE.test(handle)) errors.handle = "Use lowercase letters, numbers and hyphens only";
  else if (handle.length > 255) errors.handle = "Use 255 characters or fewer";

  if (Object.keys(errors).length) return { errors };

  const prices = variants.flatMap((variant) => (variant.price ? [Number(variant.price)] : []));
  const single = options.length === 0 ? variants[0] : undefined;

  return {
    data: {
      title,
      descriptionHtml: descriptionHtml || null,
      productType: productType || null,
      tags,
      collectionIds,
      trackInventory: variants.some((variant) => variant.trackInventory),
      options,
      variants,
      imageUrls,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      handle: handle || null,
      price: prices.length ? Math.min(...prices).toFixed(2) : null,
      compareAtPrice: single?.compareAtPrice ?? null,
      sku: single?.sku ?? null,
      barcode: single?.barcode ?? null,
      inventoryQuantity: single?.inventoryQuantity ?? null,
    },
  };
}
