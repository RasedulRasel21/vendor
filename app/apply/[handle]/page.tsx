import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, ImagePlus, Wallet } from "lucide-react";
import { applicationForm } from "@/lib/store-app";
import { ApplyForm } from "./apply-form";

type Props = { params: Promise<{ handle: string }> };

const WHAT_YOU_GET = [
  { icon: ImagePlus, text: "Add your products with photos, variants and prices" },
  { icon: BadgeCheck, text: "The store reviews them, then they go on sale" },
  { icon: Wallet, text: "Get paid what you've earned, minus the store's commission" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const form = await applicationForm(handle);
  if ("error" in form) return { title: "Apply to sell · StoreVendor" };

  return {
    title: `Sell with ${form.storeName}`,
    description: `Apply to sell your products through ${form.storeName}.`,
  };
}

export default async function ApplyPage({ params }: Props) {
  const { handle } = await params;
  const form = await applicationForm(handle);
  if ("error" in form) {
    if (form.error === "notFound") notFound();
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
        <div className="card-surface p-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-zinc-900">This page isn&apos;t available</h1>
          <p className="mt-3 text-zinc-600">{form.error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
            {form.storeName}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Sell with us
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            {form.intro ??
              `Apply to sell your products through ${form.storeName}. Tell us who you are and what you make, and we'll be in touch.`}
          </p>
        </header>

        {form.open ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            <ApplyForm
              handle={handle}
              storeName={form.storeName}
              termsUrl={form.termsUrl}
              catalogueSizes={form.catalogueSizes}
            />

            <aside className="card-surface p-6 lg:sticky lg:top-8">
              <h2 className="font-display text-lg font-semibold text-zinc-900">How it works</h2>
              <ul className="mt-5 space-y-4">
                {WHAT_YOU_GET.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm text-zinc-600">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Icon className="size-4" />
                    </span>
                    <span className="pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-zinc-200 pt-5 text-sm text-zinc-500">
                Already selling with {form.storeName}?{" "}
                <a href="/login" className="font-semibold text-primary-700 underline-offset-4 hover:underline">
                  Sign in
                </a>
              </p>
            </aside>
          </div>
        ) : (
          <div className="card-surface mt-10 max-w-2xl p-8">
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Not taking new sellers right now
            </h2>
            <p className="mt-3 text-zinc-600">
              {form.storeName} has closed applications for the moment. It&apos;s worth checking back.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
