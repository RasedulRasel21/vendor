"use client";

import { useState } from "react";
import type { ProductOption, VariantDraft } from "@/lib/product-draft";
import { optionKey } from "@/lib/product-draft";
import { secondaryButtonClass } from "@/lib/ui";
import { Modal } from "./modal";
import { InventoryFields, PricingFields, ShippingFields } from "./variant-fields";
import { VariantImageModal } from "./variant-image-modal";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}

// Shopify's variant page as a dialog: every setting for one variant. Changes apply on Done.
export function VariantModal({
  variant,
  index,
  label,
  options,
  imageUrls,
  currencyCode,
  errors,
  onClose,
  onDone,
}: {
  variant: VariantDraft;
  index: number;
  label: string;
  options: ProductOption[];
  imageUrls: string[];
  currencyCode: string;
  errors: Record<string, string>;
  onClose: () => void;
  onDone: (variant: VariantDraft) => void;
}) {
  const [draft, setDraft] = useState(variant);
  const [pickingImage, setPickingImage] = useState(false);
  const patch = (changes: Partial<VariantDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const fieldPrefix = `variants.${index}`;

  return (
    <Modal
      title={`Edit variant: ${label}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDone(draft)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Done
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Section title="Image">
            <button
              type="button"
              onClick={() => setPickingImage(true)}
              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 hover:border-zinc-500"
            >
              {draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                "Add image"
              )}
            </button>
            {errors[`${fieldPrefix}.imageUrl`] && (
              <p className="mt-1 text-xs text-red-700">{errors[`${fieldPrefix}.imageUrl`]}</p>
            )}
          </Section>
          <Section title="Options">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {options.map((option, optionIndex) =>
                option.values.length ? (
                  <div key={optionIndex} className="contents">
                    <dt className="text-zinc-500">{option.name}</dt>
                    <dd className="text-zinc-900">{draft.optionValues[optionKey(option, optionIndex)]}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </Section>
        </div>

        <Section title="Pricing">
          <PricingFields variant={draft} onChange={patch} errors={errors} fieldPrefix={fieldPrefix} currencyCode={currencyCode} />
        </Section>
        <Section title="Inventory">
          <InventoryFields variant={draft} onChange={patch} errors={errors} fieldPrefix={fieldPrefix} currencyCode={currencyCode} />
        </Section>
        <Section title="Shipping">
          <ShippingFields variant={draft} onChange={patch} errors={errors} fieldPrefix={fieldPrefix} currencyCode={currencyCode} />
        </Section>
      </div>

      {pickingImage && (
        <VariantImageModal
          variantLabel={label}
          imageUrls={imageUrls}
          selectedUrl={draft.imageUrl}
          onClose={() => setPickingImage(false)}
          onDone={(url) => {
            patch({ imageUrl: url });
            setPickingImage(false);
          }}
        />
      )}
    </Modal>
  );
}
