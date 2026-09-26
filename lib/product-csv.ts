import {
  emptyVariant,
  MAX_IMAGES,
  MAX_OPTIONS,
  MAX_VARIANTS,
  type ProductDraft,
  type ProductOption,
  type VariantDraft,
  type WeightUnit,
} from "@/lib/product-draft";

// Products as a spreadsheet, in Shopify's own column names. A vendor who already has a
// Shopify export can upload it, and what we export can be edited and uploaded back.
//
// Only the columns below are read; anything else in the file is ignored rather than
// treated as a mistake, because a real Shopify export has fifty of them.

export const COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Type",
  "Tags",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Barcode",
  "Variant Inventory Qty",
  "Variant Weight",
  "Variant Weight Unit",
  "Image Src",
  "SEO Title",
  "SEO Description",
] as const;

// Shopify has written product CSVs two ways. The classic export calls a price "Variant
// Price"; the newer template in the admin calls it "Price". A vendor shouldn't have to
// know which one they've got, so every column is looked up under both names.
const ALIASES: Record<string, string[]> = {
  Handle: ["Handle", "URL handle"],
  "Body (HTML)": ["Body (HTML)", "Description"],
  "Variant SKU": ["Variant SKU", "SKU"],
  "Variant Barcode": ["Variant Barcode", "Barcode"],
  "Variant Price": ["Variant Price", "Price"],
  "Variant Compare At Price": ["Variant Compare At Price", "Compare-at price"],
  "Variant Inventory Qty": ["Variant Inventory Qty", "Inventory quantity"],
  "Variant Cost": ["Variant Cost", "Cost per item"],
  "Variant Taxable": ["Variant Taxable", "Charge tax"],
  "Variant Requires Shipping": ["Variant Requires Shipping", "Requires shipping"],
  "Variant Inventory Policy": ["Variant Inventory Policy", "Continue selling when out of stock"],
  "Variant Weight": ["Variant Weight"],
  "Variant Grams": ["Variant Grams", "Weight value (grams)"],
  "Variant Weight Unit": ["Variant Weight Unit", "Weight unit for display"],
  "Image Src": ["Image Src", "Product image URL"],
  "Variant Image": ["Variant Image", "Variant image URL"],
  "SEO Title": ["SEO Title", "SEO title"],
  "SEO Description": ["SEO Description", "SEO description"],
};

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 2000;

const WEIGHT_UNITS: Record<string, WeightUnit> = {
  kg: "KILOGRAMS",
  kilograms: "KILOGRAMS",
  g: "GRAMS",
  grams: "GRAMS",
  lb: "POUNDS",
  lbs: "POUNDS",
  pounds: "POUNDS",
  oz: "OUNCES",
  ounces: "OUNCES",
};

// A comma-separated file, read properly: quoted fields may hold commas, newlines and
// doubled quotes. Hand-rolled because every row of a spreadsheet a vendor typed is a
// chance to lose their data to a clever shortcut.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  // A byte-order mark at the start of a file saved by Excel would otherwise become part
  // of the first column's name.
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Either line ending, and \r\n counts once.
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  return rows;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export type ImportProblem = { line: number | null; product: string; message: string };

export type ParsedProduct = {
  key: string;
  title: string;
  draft: ProductDraft;
  rows: number[];
  // Option names by position, remembered from the row that named them.
  optionNames: string[];
};

const trimmed = (value: string | undefined) => (value ?? "").trim();

function blankDraft(): ProductDraft {
  return {
    title: "",
    descriptionHtml: "",
    productType: "",
    tags: [],
    collectionIds: [],
    trackInventory: true,
    options: [],
    variants: [],
    imageUrls: [],
    seoTitle: "",
    seoDescription: "",
    handle: "",
  };
}

// Rows that share a handle are one product with several variants, the way Shopify writes
// them. A file with no Handle column is a simpler thing a vendor typed themselves: one
// product per row, grouped by title so repeated titles still become variants.
export function csvToProducts(text: string): { products: ParsedProduct[]; problems: ImportProblem[] } {
  const rows = parseCsv(text);
  const problems: ImportProblem[] = [];

  if (!rows.length) return { products: [], problems: [{ line: null, product: "", message: "The file is empty." }] };
  if (rows.length - 1 > MAX_ROWS) {
    return {
      products: [],
      problems: [{ line: null, product: "", message: `That's ${rows.length - 1} rows. Split it into files of ${MAX_ROWS} or fewer.` }],
    };
  }

  const header = rows[0].map((name) => name.trim());
  const index = new Map(header.map((name, i) => [name.toLowerCase(), i]));
  const at = (row: string[], column: string) => {
    for (const name of ALIASES[column] ?? [column]) {
      const i = index.get(name.toLowerCase());
      if (i !== undefined && trimmed(row[i]) !== "") return trimmed(row[i]);
    }
    return "";
  };
  const hasColumn = (column: string) =>
    (ALIASES[column] ?? [column]).some((name) => index.has(name.toLowerCase()));

  if (!index.has("title") && !hasColumn("Handle")) {
    return {
      products: [],
      problems: [
        {
          line: 1,
          product: "",
          message: "No Title or Handle column. The first row of the file has to name the columns.",
        },
      ],
    };
  }

  const byKey = new Map<string, ParsedProduct>();

  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const handle = at(row, "Handle");
    const title = at(row, "Title");
    const key = (handle || title).toLowerCase();

    if (!key) {
      problems.push({ line, product: "", message: "No handle or title on this row, so there's nothing to add it to." });
      return;
    }

    let product = byKey.get(key);
    if (!product) {
      if (!title) {
        problems.push({ line, product: handle, message: "The first row for a product needs a Title." });
        return;
      }
      product = { key, title, draft: { ...blankDraft(), title, handle }, rows: [], optionNames: [] };
      byKey.set(key, product);
    }
    product.rows.push(line);

    const draft = product.draft;

    // Product-level fields come from whichever row has them, so a Shopify export — which
    // only fills them on the first row of each product — works unchanged.
    if (!draft.descriptionHtml && at(row, "Body (HTML)")) draft.descriptionHtml = at(row, "Body (HTML)");
    if (!draft.productType && at(row, "Type")) draft.productType = at(row, "Type");
    if (!draft.seoTitle && at(row, "SEO Title")) draft.seoTitle = at(row, "SEO Title");
    if (!draft.seoDescription && at(row, "SEO Description")) draft.seoDescription = at(row, "SEO Description");
    if (!draft.tags.length && at(row, "Tags")) {
      draft.tags = at(row, "Tags")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    const image = at(row, "Image Src");
    if (image && !draft.imageUrls.includes(image)) draft.imageUrls.push(image);

    // An option is named once, on the product's first row; every row after that carries
    // only its value. So the name is remembered by position, and a later row asking for
    // "Small" with no name still knows it means Size.
    const optionValues: Record<string, string> = {};
    for (let n = 1; n <= MAX_OPTIONS; n += 1) {
      const value = at(row, `Option${n} Value`);
      if (!value) continue;

      // Shopify writes Title / Default Title for a product with no real options.
      if (value.toLowerCase() === "default title") continue;

      const name = at(row, `Option${n} Name`) || product.optionNames[n - 1];
      if (!name) continue;
      product.optionNames[n - 1] = name;

      let option = draft.options.find((o) => o.name.toLowerCase() === name.toLowerCase());
      if (!option) {
        option = { name, values: [] } as ProductOption;
        draft.options.push(option);
      }
      if (!option.values.includes(value)) option.values.push(value);
      optionValues[option.name] = value;
    }

    // A row with no variant detail at all is an extra image for the product, not a variant.
    const hasVariant =
      Object.keys(optionValues).length > 0 ||
      ["Variant SKU", "Variant Price", "Variant Barcode", "Variant Inventory Qty", "Variant Grams", "Variant Weight"].some(
        (column) => at(row, column),
      );
    if (!hasVariant && draft.variants.length) return;

    // Two ways of giving a weight: a number with a unit, or a number of grams. When it's
    // grams, that's what it is — the file's "unit for display" doesn't change the value.
    const grams = at(row, "Variant Grams");
    const weight = at(row, "Variant Weight") || grams;
    const weightUnit = grams
      ? "GRAMS"
      : (WEIGHT_UNITS[at(row, "Variant Weight Unit").toLowerCase()] ?? "KILOGRAMS");

    const yes = (value: string) => /^(true|yes|1)$/i.test(value.trim());
    const taxable = at(row, "Variant Taxable");
    const shipping = at(row, "Variant Requires Shipping");

    const variant: VariantDraft = {
      ...emptyVariant(optionValues),
      price: at(row, "Variant Price"),
      compareAtPrice: at(row, "Variant Compare At Price"),
      costPerItem: at(row, "Variant Cost"),
      sku: at(row, "Variant SKU"),
      barcode: at(row, "Variant Barcode"),
      inventoryQuantity: at(row, "Variant Inventory Qty"),
      imageUrl: at(row, "Variant Image"),
      // Shopify writes CONTINUE or DENY; anything else means the usual "stop selling".
      continueSelling: /^continue$/i.test(at(row, "Variant Inventory Policy")),
      taxable: taxable === "" ? true : yes(taxable),
      requiresShipping: shipping === "" ? true : yes(shipping),
      weight,
      weightUnit: weightUnit as VariantDraft["weightUnit"],
    };
    draft.variants.push(variant);
  });

  const products: ParsedProduct[] = [];
  for (const product of byKey.values()) {
    const { draft } = product;
    const where = `row ${product.rows[0]}`;

    if (!draft.variants.length) draft.variants.push(emptyVariant({}));

    if (draft.variants.length > MAX_VARIANTS) {
      problems.push({
        line: product.rows[0],
        product: product.title,
        message: `${draft.variants.length} variants at ${where}; the most a product can have is ${MAX_VARIANTS}.`,
      });
      continue;
    }
    if (draft.imageUrls.length > MAX_IMAGES) {
      // Too many pictures shouldn't lose the product, so the extra ones are dropped and
      // the vendor is told.
      problems.push({
        line: product.rows[0],
        product: product.title,
        message: `Only the first ${MAX_IMAGES} images were kept.`,
      });
      draft.imageUrls = draft.imageUrls.slice(0, MAX_IMAGES);
    }

    const badImage = draft.imageUrls.find((url) => !/^https:\/\//i.test(url));
    if (badImage) {
      problems.push({
        line: product.rows[0],
        product: product.title,
        message: `Image addresses have to start with https:// — "${badImage.slice(0, 60)}" doesn't.`,
      });
      draft.imageUrls = draft.imageUrls.filter((url) => /^https:\/\//i.test(url));
    }

    products.push(product);
  }

  return { products, problems };
}

// The other direction: what a vendor already has, as a file they can edit and send back.
export function productsToCsv(
  products: {
    title: string;
    handle: string | null;
    descriptionHtml: string | null;
    description: string | null;
    productType: string | null;
    tags: string[];
    seoTitle: string | null;
    seoDescription: string | null;
    imageUrls: string[];
    options: ProductOption[];
    variants: {
      optionValues?: Record<string, string>;
      price?: string | number | null;
      compareAtPrice?: string | number | null;
      sku?: string | null;
      barcode?: string | null;
      inventoryQuantity?: number | null;
      weight?: string | number | null;
      weightUnit?: string | null;
    }[];
  }[],
): string {
  const rows: (string | number | null)[][] = [[...COLUMNS]];

  for (const product of products) {
    const handle = product.handle || product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const variants = product.variants.length ? product.variants : [{}];
    // Every image gets a row, even when there are more images than variants, so nothing
    // is lost on the way out.
    const lines = Math.max(variants.length, product.imageUrls.length);

    for (let i = 0; i < lines; i += 1) {
      const variant = variants[i];
      const first = i === 0;
      const values = variant?.optionValues ?? {};

      rows.push([
        handle,
        first ? product.title : "",
        first ? (product.descriptionHtml ?? product.description ?? "") : "",
        first ? (product.productType ?? "") : "",
        first ? product.tags.join(", ") : "",
        product.options[0]?.name ?? "",
        values[product.options[0]?.name ?? ""] ?? "",
        product.options[1]?.name ?? "",
        values[product.options[1]?.name ?? ""] ?? "",
        product.options[2]?.name ?? "",
        values[product.options[2]?.name ?? ""] ?? "",
        variant?.sku ?? "",
        variant?.price ?? "",
        variant?.compareAtPrice ?? "",
        variant?.barcode ?? "",
        variant?.inventoryQuantity ?? "",
        variant?.weight ?? "",
        variant?.weightUnit ?? "",
        product.imageUrls[i] ?? "",
        first ? (product.seoTitle ?? "") : "",
        first ? (product.seoDescription ?? "") : "",
      ]);
    }
  }

  return toCsv(rows);
}
