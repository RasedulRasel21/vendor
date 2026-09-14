export type ProductFormValues = {
  title: string;
  description: string;
  productType: string;
  tags: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  barcode: string;
  inventoryQuantity: string;
  imageUrls: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues | "form", string>>;

export type ProductData = {
  title: string;
  description: string | null;
  productType: string | null;
  tags: string[];
  price: string | null;
  compareAtPrice: string | null;
  sku: string | null;
  barcode: string | null;
  inventoryQuantity: number | null;
  imageUrls: string[];
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  title: "",
  description: "",
  productType: "",
  tags: "",
  price: "",
  compareAtPrice: "",
  sku: "",
  barcode: "",
  inventoryQuantity: "",
  imageUrls: "",
};

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const MAX_IMAGES = 10;
const MAX_TAGS = 50;

export function readProductForm(formData: FormData): ProductFormValues {
  const read = (key: keyof ProductFormValues) => String(formData.get(key) ?? "");
  return {
    title: read("title"),
    description: read("description"),
    productType: read("productType"),
    tags: read("tags"),
    price: read("price"),
    compareAtPrice: read("compareAtPrice"),
    sku: read("sku"),
    barcode: read("barcode"),
    inventoryQuantity: read("inventoryQuantity"),
    imageUrls: read("imageUrls"),
  };
}

// Drafts only need a title; submitting for approval also needs a price.
export function validateProductForm(
  values: ProductFormValues,
  { forSubmit }: { forSubmit: boolean },
): { errors: ProductFormErrors } | { data: ProductData } {
  const errors: ProductFormErrors = {};
  const optional = (value: string) => value.trim() || null;

  const title = values.title.trim();
  if (!title) errors.title = "Enter a product title";
  else if (title.length > 255) errors.title = "Use 255 characters or fewer";

  const price = values.price.trim();
  if (price && !AMOUNT.test(price)) errors.price = "Enter a price like 19.99";
  else if (!price && forSubmit) errors.price = "Enter a price before submitting";

  const compareAtPrice = values.compareAtPrice.trim();
  if (compareAtPrice && !AMOUNT.test(compareAtPrice)) {
    errors.compareAtPrice = "Enter an amount like 24.99";
  } else if (compareAtPrice && price && Number(compareAtPrice) <= Number(price)) {
    errors.compareAtPrice = "Compare-at price must be higher than the price";
  }

  const quantity = values.inventoryQuantity.trim();
  if (quantity && (!/^\d{1,7}$/.test(quantity))) {
    errors.inventoryQuantity = "Enter a whole number of 0 or more";
  }

  const tags = [...new Set(values.tags.split(",").map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > MAX_TAGS) errors.tags = `Use up to ${MAX_TAGS} tags`;
  else if (tags.some((tag) => tag.length > 40)) errors.tags = "Keep each tag to 40 characters or fewer";

  const imageUrls = values.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  if (imageUrls.length > MAX_IMAGES) {
    errors.imageUrls = `Add up to ${MAX_IMAGES} images`;
  } else if (imageUrls.some((url) => !isHttpsUrl(url))) {
    errors.imageUrls = "Each image must be a full link starting with https://";
  }

  if (Object.keys(errors).length) return { errors };

  return {
    data: {
      title,
      description: optional(values.description),
      productType: optional(values.productType),
      tags,
      price: price ? Number(price).toFixed(2) : null,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice).toFixed(2) : null,
      sku: optional(values.sku),
      barcode: optional(values.barcode),
      inventoryQuantity: quantity ? Number(quantity) : null,
      imageUrls,
    },
  };
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
