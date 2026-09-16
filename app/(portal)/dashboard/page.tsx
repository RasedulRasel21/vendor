import { CircleAlert, CircleCheck, FilePen, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { ProductThumb } from "@/components/portal/product-thumb";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireVendorUser } from "@/lib/session";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Home · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

type Task = {
  key: string;
  icon: typeof CircleAlert;
  tone: string;
  title: string;
  detail: string;
  href: string;
  action: string;
};

export default async function DashboardPage() {
  const user = await requireVendorUser();
  const vendor = user.Vendor;

  const [grouped, liveProducts, needsChanges, recent, pendingPayout, settings] = await Promise.all([
    db.productSubmission.groupBy({ by: ["status"], where: { vendorId: vendor.id }, _count: { _all: true } }),
    db.vendorProduct.count({ where: { vendorId: vendor.id } }),
    db.productSubmission.findMany({
      where: { vendorId: vendor.id, status: "REJECTED" },
      orderBy: { reviewedAt: "desc" },
      take: 3,
      select: { id: true, title: true, reviewNote: true },
    }),
    db.productSubmission.findMany({
      where: { vendorId: vendor.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, imageUrls: true, price: true, updatedAt: true },
    }),
    db.vendorChangeRequest.count({ where: { vendorId: vendor.id, type: "PAYOUT", status: "PENDING" } }),
    db.shopSettings.findUnique({ where: { shop: vendor.shop }, select: { currencyCode: true } }),
  ]);

  // Orders the store ships aren't the vendor's job, so they don't show up as a task.
  const ordersToShip = await db.vendorOrder.count({
    where: { vendorId: vendor.id, status: "OPEN", shippingMode: "VENDOR_SHIPS" },
  });

  const count = (status: string) => grouped.find((row) => row.status === status)?._count._all ?? 0;
  const drafts = count("DRAFT");
  const awaiting = count("PENDING");
  const changesRequested = count("REJECTED");
  const currencyCode = settings?.currencyCode ?? "USD";
  const firstName = (user.name ?? "").trim().split(/\s+/)[0];

  const tasks: Task[] = [];
  if (ordersToShip > 0) {
    tasks.push({
      key: "ship",
      icon: Truck,
      tone: "bg-secondary-100 text-secondary-700",
      title: `Ship ${ordersToShip} ${ordersToShip === 1 ? "order" : "orders"}`,
      detail: "Customers are waiting. Add the courier and tracking when you send them.",
      href: "/orders?status=OPEN",
      action: "View orders",
    });
  }

  tasks.push(...needsChanges.map((product) => ({
    key: `changes-${product.id}`,
    icon: CircleAlert,
    tone: "bg-red-50 text-red-600",
    title: `Update ${product.title}`,
    detail: product.reviewNote ?? "The store asked for changes before it can go live.",
    href: `/products/${product.id}`,
    action: "Fix product",
  })));
  if (changesRequested > needsChanges.length) {
    const more = changesRequested - needsChanges.length;
    tasks.push({
      key: "changes-more",
      icon: CircleAlert,
      tone: "bg-red-50 text-red-600",
      title: `${more} more ${more === 1 ? "product needs" : "products need"} changes`,
      detail: "Open each one to read the store's note.",
      href: "/products?status=REJECTED",
      action: "View all",
    });
  }
  if (!vendor.payoutMethod && !pendingPayout) {
    tasks.push({
      key: "payout",
      icon: Wallet,
      tone: "bg-secondary-100 text-secondary-700",
      title: "Add your payout details",
      detail: "The store needs them to send your earnings.",
      href: "/settings",
      action: "Add details",
    });
  }
  if (drafts > 0) {
    tasks.push({
      key: "drafts",
      icon: FilePen,
      tone: "bg-zinc-100 text-zinc-600",
      title: `Finish ${drafts} ${drafts === 1 ? "draft" : "drafts"}`,
      detail: "Drafts stay private until you submit them for approval.",
      href: "/products?status=DRAFT",
      action: "View drafts",
    });
  }

  const stages = [
    { label: "Drafts", value: drafts, color: "bg-zinc-300", href: "/products?status=DRAFT" },
    { label: "Awaiting approval", value: awaiting, color: "bg-secondary-500", href: "/products?status=PENDING" },
    { label: "Changes requested", value: changesRequested, color: "bg-red-400", href: "/products?status=REJECTED" },
    { label: "Live in the store", value: liveProducts, color: "bg-primary-500", href: "/products?status=APPROVED" },
  ];
  const totalInPipeline = stages.reduce((sum, stage) => sum + stage.value, 0);

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={`Everything happening with ${vendor.name} products.`}
        actions={
          <Link href="/products/new" className={primaryButtonClass}>
            Add product
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section aria-labelledby="todo-heading" className="card-surface">
          <div className="px-6 pb-4 pt-5">
            <h2 id="todo-heading" className="font-display text-lg font-semibold">
              To do
            </h2>
            <p className="text-sm text-zinc-500">
              {tasks.length
                ? `${tasks.length} ${tasks.length === 1 ? "thing needs" : "things need"} your attention`
                : "Nothing needs you right now"}
            </p>
          </div>

          {tasks.length ? (
            <ul>
              {tasks.map(({ key, icon: Icon, tone, title, detail, href, action }) => (
                <li key={key} className="flex items-start gap-4 border-t border-zinc-100 px-6 py-4">
                  <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{detail}</p>
                  </div>
                  <Link href={href} className={`${secondaryButtonClass} shrink-0 self-center`}>
                    {action}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-4 border-t border-zinc-100 px-6 py-8">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <CircleCheck className="size-6" />
              </span>
              <div>
                <p className="font-medium text-zinc-900">You&apos;re all caught up</p>
                <p className="text-sm text-zinc-600">
                  Tasks show up here when the store asks for changes or something needs finishing.
                </p>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="pipeline-heading" className="card-surface p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="pipeline-heading" className="font-display text-lg font-semibold">
              Your catalogue
            </h2>
            <p className="text-sm tabular-nums text-zinc-500">
              {totalInPipeline} {totalInPipeline === 1 ? "product" : "products"}
            </p>
          </div>

          <div
            className="mt-5 flex h-3 overflow-hidden rounded-full bg-zinc-100"
            role="img"
            aria-label={stages.map((stage) => `${stage.label}: ${stage.value}`).join(", ")}
          >
            {totalInPipeline > 0 &&
              stages.map((stage) =>
                stage.value ? (
                  <span
                    key={stage.label}
                    className={`${stage.color} h-full border-r-2 border-white last:border-r-0`}
                    style={{ width: `${(stage.value / totalInPipeline) * 100}%` }}
                  />
                ) : null,
              )}
          </div>

          <ul className="mt-5 space-y-1">
            {stages.map((stage) => (
              <li key={stage.label}>
                <Link
                  href={stage.href}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-50"
                >
                  <span aria-hidden className={`size-2.5 rounded-full ${stage.color}`} />
                  <span className="flex-1 text-zinc-700">{stage.label}</span>
                  <span className="font-semibold tabular-nums text-zinc-900">{stage.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="recent-heading" className="mt-6 card-surface">
        <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
          <h2 id="recent-heading" className="font-display text-lg font-semibold">
            Recently updated
          </h2>
          {recent.length > 0 && (
            <Link href="/products" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline">
              All products
            </Link>
          )}
        </div>

        {recent.length ? (
          <ul>
            {recent.map((product) => (
              <li key={product.id} className="border-t border-zinc-100">
                <Link
                  href={`/products/${product.id}`}
                  className="flex items-center gap-4 px-6 py-3 transition hover:bg-zinc-50"
                >
                  <ProductThumb src={product.imageUrls[0]} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">{product.title}</span>
                  <span className="hidden sm:block">
                    <StatusBadge status={product.status} />
                  </span>
                  <span className="hidden w-24 text-right text-sm tabular-nums text-zinc-700 md:block">
                    {product.price ? formatMoney(product.price.toFixed(2), currencyCode) : "—"}
                  </span>
                  <span className="w-24 text-right text-sm text-zinc-500">{dateFormat.format(product.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-t border-zinc-100 px-6 py-10 text-center">
            <p className="font-medium text-zinc-900">Add your first product</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              Add photos, prices and variants, then submit it. It goes live once the store approves it.
            </p>
            <Link href="/products/new" className={`${primaryButtonClass} mt-5`}>
              Add product
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
