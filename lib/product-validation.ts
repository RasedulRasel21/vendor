import { z } from "zod";
import {
  MAX_IMAGES,
  MAX_OPTIONS,
  MAX_VARIANTS,
  variantCombinations,
  variantLabel,
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

const draftSchema = z.object({
  title: z.string().max(2000),
  descriptionHtml: z.string().max(200000),
  productType: z.string().max(2000),
  tags: z.array(z.string().max(2000)).max(1000),
  trackInventory: z.boolean(),
  options: z
    .array(z.object({ name: z.string().max(2000), values: z.array(z.string().max(2000)).max(1000) }))
    .max(20),
  variants: z
    .array(
      z.object({
        optionValues: z.record(z.string(), z.string()),
        price: z.string().max(100),
        compareAtPrice: z.string().max(100),
        sku: z.string().max(2000),
        barcode: z.string().max(2000),
        inventoryQuantity: z.string().max(100),
      }),
    )
    .max(5000),
  imageUrls: z.array(z.string().max(5000)).max(200),
  seoTitle: z.string().max(2000),
  seoDescription: z.string().max(5000),
  handle: z.string().max(2000),
});

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,7}$/;
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

// Drafts can be incomplete; submitting for approval also needs every price.
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

  const combinations = variantCombinations(options);
  if (combinations.length > MAX_VARIANTS) {
    errors.variants = `Products can have up to ${MAX_VARIANTS} variants`;
  }

  const draftsByLabel = new Map(
    draft.variants.map((variant) => [variantLabel(variant.optionValues, draft.options), variant]),
  );
  const variants: StoredVariant[] = [];

  combinations.forEach((combination, index) => {
    const input = draftsByLabel.get(variantLabel(combination, options));
    if (!input) {
      errors.variants ??= "The variants don't match the options. Check the variants table.";
      return;
    }

    const key = `variants.${index}`;
    const price = input.price.trim();
    const compareAtPrice = input.compareAtPrice.trim();
    const quantity = input.inventoryQuantity.trim();
    const sku = input.sku.trim();
    const barcode = input.barcode.trim();

    if (price && !AMOUNT.test(price)) errors[`${key}.price`] = "Enter a price like 19.99";
    else if (!price && forSubmit) errors[`${key}.price`] = "Enter a price";

    if (compareAtPrice && !AMOUNT.test(compareAtPrice)) {
      errors[`${key}.compareAtPrice`] = "Enter an amount like 24.99";
    } else if (compareAtPrice && AMOUNT.test(price) && Number(compareAtPrice) <= Number(price)) {
      errors[`${key}.compareAtPrice`] = "Must be higher than the price";
    }

    if (draft.trackInventory && quantity && !QUANTITY.test(quantity)) {
      errors[`${key}.inventoryQuantity`] = "Enter a whole number";
    }
    if (sku.length > 255) errors[`${key}.sku`] = "Use 255 characters or fewer";
    if (barcode.length > 255) errors[`${key}.barcode`] = "Use 255 characters or fewer";

    variants.push({
      optionValues: combination,
      price: AMOUNT.test(price) ? Number(price).toFixed(2) : null,
      compareAtPrice: AMOUNT.test(compareAtPrice) ? Number(compareAtPrice).toFixed(2) : null,
      sku: sku || null,
      barcode: barcode || null,
      inventoryQuantity: draft.trackInventory && QUANTITY.test(quantity) ? Number(quantity) : null,
    });
  });

  const imageUrls = unique(draft.imageUrls.map((url) => url.trim()).filter(Boolean));
  if (imageUrls.length > MAX_IMAGES) errors.imageUrls = `Add up to ${MAX_IMAGES} images`;
  else if (imageUrls.some((url) => !isHttpsUrl(url))) {
    errors.imageUrls = "Each image link must start with https://";
  }

  const seoTitle = draft.seoTitle.trim();
  const seoDescription = draft.seoDescription.trim();
  const handle = draft.handle.trim().toLowerCase();
  if (seoTitle.length > 70) errors.seoTitle = "Use 70 characters or fewer";
  if (seoDescription.length > 320) errors.seoDescription = "Use 320 characters or fewer";
  if (handle && !HANDLE.test(handle)) {
    errors.handle = "Use lowercase letters, numbers and hyphens only";
  } else if (handle.length > 255) {
    errors.handle = "Use 255 characters or fewer";
  }

  if (Object.keys(errors).length) return { errors };

  const prices = variants.flatMap((variant) => (variant.price ? [Number(variant.price)] : []));
  const single = options.length === 0 ? variants[0] : undefined;

  return {
    data: {
      title,
      descriptionHtml: descriptionHtml || null,
      productType: productType || null,
      tags,
      trackInventory: draft.trackInventory,
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
