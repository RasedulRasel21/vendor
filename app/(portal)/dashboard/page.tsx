import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard · StoreVendor",
};

export default async function DashboardPage() {
  const user = await requireVendorUser();

  const [grouped, liveProducts] = await Promise.all([
    db.productSubmission.groupBy({
      by: ["status"],
      where: { vendorId: user.vendorId },
      _count: { _all: true },
    }),
    db.vendorProduct.count({ where: { vendorId: user.vendorId } }),
  ]);
  const count = (status: string) =>
    grouped.find((row) => row.status === status)?._count._all ?? 0;

  const cards = [
    { label: "Live in store", value: liveProducts, href: "/products" },
    { label: "Awaiting approval", value: count("PENDING"), href: "/products?status=PENDING" },
    { label: "Changes requested", value: count("REJECTED"), href: "/products?status=REJECTED" },
    { label: "Drafts", value: count("DRAFT"), href: "/products?status=DRAFT" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Welcome, {user.name ?? user.email}
      </h1>
      <p className="mt-1 text-zinc-600">Here&apos;s how your products are doing.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/products/new"
        className="mt-8 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
      >
        Add product
      </Link>
    </div>
  );
}
