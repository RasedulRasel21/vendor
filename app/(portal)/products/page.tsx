import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { SUBMISSION_STATUS, type SubmissionStatus } from "@/lib/product-status";
import { requireVendorUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Products · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const user = await requireVendorUser();
  const { status: requested } = await searchParams;
  const status =
    typeof requested === "string" && requested in SUBMISSION_STATUS
      ? (requested as SubmissionStatus)
      : undefined;

  const submissions = await db.productSubmission.findMany({
    where: { vendorId: user.vendorId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  const filters: { label: string; value?: SubmissionStatus }[] = [
    { label: "All" },
    ...(Object.keys(SUBMISSION_STATUS) as SubmissionStatus[]).map((value) => ({
      label: SUBMISSION_STATUS[value].label,
      value,
    })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
        <Link
          href="/products/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Add product
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {filters.map((filter) => {
          const active = filter.value === status;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/products?status=${filter.value}` : "/products"}
              className={`rounded-full border px-3 py-1 ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {submissions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="font-medium text-zinc-900">No products here yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Add a product and submit it for approval. Once the store approves it, it goes live.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${submission.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {submission.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-700">
                    {submission.price ? submission.price.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {dateFormat.format(submission.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
