import type { Metadata } from "next";
import { PageHeader } from "@/components/portal/page-header";
import { MAX_ROWS } from "@/lib/product-csv";
import { requireVendorUser } from "@/lib/session";
import { ImportForm } from "./import-form";

export const metadata: Metadata = {
  title: "Import products · StoreVendor",
};

export default async function ImportProductsPage() {
  await requireVendorUser();

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title="Import products"
        description="Add a lot of products at once from a spreadsheet. Everything arrives as a draft for you to check."
      />

      <ImportForm />

      <section className="card-surface mt-6 p-5 text-sm text-zinc-600 sm:p-6">
        <h2 className="font-display text-base font-semibold text-zinc-900">How the file should look</h2>
        <p className="mt-2">
          The first row names the columns. It uses Shopify&apos;s own names, so a product
          export from a Shopify store works as it is — and so does the file you get from
          <span className="font-medium text-zinc-900"> Download what I have</span>. Columns
          we don&apos;t recognise are ignored.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4 font-semibold">Column</th>
                <th className="py-2 font-semibold">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Title</td>
                <td className="py-2">Required, on the first row of each product.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Handle</td>
                <td className="py-2">
                  Rows sharing a handle become one product with several variants. Leave it
                  out and each title is its own product.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Body (HTML), Type, Tags</td>
                <td className="py-2">Description, product type, and tags separated by commas.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Option1 Name / Value</td>
                <td className="py-2">Up to three, for example Size and Small. One row per variant.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Variant Price, SKU, Barcode, Inventory Qty</td>
                <td className="py-2">Per variant. Prices can be left out on a draft and added later.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">Image Src</td>
                <td className="py-2">
                  One image per row, starting with https://. Extra rows with the same handle
                  add more images.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-900">SEO Title, SEO Description</td>
                <td className="py-2">Optional.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          Up to {MAX_ROWS.toLocaleString("en-GB")} rows and 2 MB per file. A draft you
          already have with the same title is updated rather than added again, so you can
          fix a file and upload it a second time safely.
        </p>
      </section>
    </div>
  );
}
