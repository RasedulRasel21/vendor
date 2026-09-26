import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { ProductThumb } from "@/components/portal/product-thumb";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { SUBMISSION_STATUS, type SubmissionStatus } from "@/lib/product-status";
import { requireVendorUser } from "@/lib/session";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Products · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const user = await requireVendorUser();
  const { status: requestedStatus, q, saved } = await searchParams;
  const status =
    typeof requestedStatus === "string" && requestedStatus in SUBMISSION_STATUS
      ? (requestedStatus as SubmissionStatus)
      : undefined;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";

  const [submissions, grouped, settings] = await Promise.all([
    db.productSubmission.findMany({
      where: {
        vendorId: user.vendorId,
        ...(status ? { status } : {}),
        ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        imageUrls: true,
        price: true,
        variants: true,
        updatedAt: true,
        pendingSubmittedAt: true,
      },
    }),
    db.productSubmission.groupBy({ by: ["status"], where: { vendorId: user.vendorId }, _count: { _all: true } }),
    db.shopSettings.findUnique({ where: { shop: user.Vendor.shop }, select: { currencyCode: true } }),
  ]);

  const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const currencyCode = settings?.currencyCode ?? "USD";

  const filters: { label: string; value?: SubmissionStatus; count: number }[] = [
    { label: "All", count: total },
    ...(Object.keys(SUBMISSION_STATUS) as SubmissionStatus[]).map((value) => ({
      label: SUBMISSION_STATUS[value].label,
      value,
      count: counts[value] ?? 0,
    })),
  ];

  const hrefFor = (value?: SubmissionStatus) => {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    if (query) params.set("q", query);
    const search = params.toString();
    return search ? `/products?${search}` : "/products";
  };

  return (
    <div>
      {saved === "deleted" && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700"
        >
          Product deleted.
        </p>
      )}

      <PageHeader
        title="Products"
        description="Everything you've added, from drafts to products live in the store."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/products/import" className={secondaryButtonClass}>
              Import
            </Link>
            {/* A file to save, not a page to open: Link would navigate instead of downloading. */}
            <a href="/products/export" download className={secondaryButtonClass}>
              Export
            </a>
            <Link href="/products/new" className={primaryButtonClass}>
              Add product
            </Link>
          </div>
        }
      />

      <div className="card-surface">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {filters.map((filter) => {
              const active = filter.value === status;
              return (
                <Link
                  key={filter.label}
                  href={hrefFor(filter.value)}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-primary-600 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {filter.label}
                  <span className={`text-xs tabular-nums ${active ? "text-primary-100" : "text-zinc-400"}`}>{filter.count}</span>
                </Link>
              );
            })}
          </nav>

          <form action="/products" className="relative sm:w-64" role="search">
            {status && <input type="hidden" name="status" value={status} />}
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search products"
              aria-label="Search products"
              className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-200/50"
            />
          </form>
        </div>

        {submissions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-zinc-900">
              {query ? "No products match your search" : status ? `No products are ${SUBMISSION_STATUS[status].label.toLowerCase()}` : "Add your first product"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              {query
                ? "Try a different word, or clear the search to see everything."
                : status
                  ? "Products show up here when they reach this stage."
                  : "Add photos, prices and variants, then submit it. It goes live once the store approves it."}
            </p>
            {query ? (
              <Link href={hrefFor(status)} className="mt-5 inline-flex text-sm font-medium text-zinc-800 underline underline-offset-4">
                Clear search
              </Link>
            ) : (
              !status && (
                <Link href="/products/new" className={`${primaryButtonClass} mt-5`}>
                  Add product
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-6 py-3 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const variantCount = Array.isArray(submission.variants) ? submission.variants.length : 1;
                  return (
                    <tr key={submission.id} className="group border-t border-zinc-100 transition hover:bg-zinc-50">
                      <td className="px-6 py-3">
                        <Link href={`/products/${submission.id}`} className="flex items-center gap-3">
                          <ProductThumb src={submission.imageUrls[0]} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-zinc-900 group-hover:underline">
                              {submission.title}
                            </span>
                            <span className="block text-xs text-zinc-500">
                              {variantCount} {variantCount === 1 ? "variant" : "variants"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={submission.status} />
                        {submission.pendingSubmittedAt && (
                          <span className="mt-1 block text-xs text-amber-700">Changes pending</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-800">
                        {submission.price ? formatMoney(submission.price.toFixed(2), currencyCode) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-zinc-500">{dateFormat.format(submission.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
