"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BulkEditModal } from "@/components/editor/bulk-edit-modal";
import { Card } from "@/components/editor/card";
import { CollectionPicker, type CollectionOption } from "@/components/editor/collection-picker";
import { MediaField } from "@/components/editor/media-field";
import { OptionsEditor } from "@/components/editor/options-editor";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { SeoEditor } from "@/components/editor/seo-editor";
import { TagInput } from "@/components/editor/tag-input";
import { InventoryFields, PricingFields, ShippingFields } from "@/components/editor/variant-fields";
import { VariantImageModal } from "@/components/editor/variant-image-modal";
import { VariantModal } from "@/components/editor/variant-modal";
import { VariantsTable } from "@/components/editor/variants-table";
import {
  hasVariantOptions,
  syncVariants,
  variantLabel,
  type ProductDraft,
  type ProductOption,
  type VariantDraft,
} from "@/lib/product-draft";
import { errorClass, inputClass, labelClass } from "@/lib/ui";
import { saveProduct, type ProductEditorState } from "./actions";

const initialState: ProductEditorState = {};

export function ProductEditor({
  submissionId,
  initialDraft,
  shopDomain,
  vendorId,
  currencyCode,
  collections,
  mode = "draft",
}: {
  submissionId: string | null;
  initialDraft: ProductDraft;
  shopDomain: string;
  vendorId: string;
  currencyCode: string;
  collections: CollectionOption[];
  // "live" products are edited through review; "pending" ones are still waiting for a first review.
  mode?: "draft" | "pending" | "live";
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [uploading, setUploading] = useState(false);
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [imagePickerFor, setImagePickerFor] = useState<number | null>(null);
  const [bulkIndices, setBulkIndices] = useState<number[] | null>(null);
  const [state, formAction, pending] = useActionState(
    saveProduct.bind(null, submissionId),
    initialState,
  );

  const errors = state.errors ?? {};
  const errorCount = Object.keys(errors).length;
  const payload = JSON.stringify(draft);
  const savedPayload = useMemo(() => JSON.stringify(initialDraft), [initialDraft]);
  const dirty = payload !== savedPayload;
  const withVariants = hasVariantOptions(draft.options);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setOptions = (options: ProductOption[]) =>
    setDraft((current) => ({
      ...current,
      options,
      variants: syncVariants(current.options, current.variants, options),
    }));

  const patchVariants = (indices: number[], patch: Partial<VariantDraft>) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, index) => (indices.includes(index) ? { ...variant, ...patch } : variant)),
    }));

  const deleteVariants = (indices: number[]) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((_, index) => !indices.includes(index)),
    }));

  const fieldProps = {
    variant: draft.variants[0],
    onChange: (patch: Partial<VariantDraft>) => patchVariants([0], patch),
    errors,
    fieldPrefix: "variants.0",
    currencyCode,
  };

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />

      <div
        className={`sticky top-16 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors lg:top-4 ${
          dirty
            ? "border-zinc-700 bg-zinc-800 text-white shadow-lg shadow-zinc-900/15"
            : "border-zinc-200 bg-white/90 text-zinc-600 backdrop-blur"
        }`}
      >
        <p className="text-sm font-medium">
          {pending ? "Saving…" : uploading ? "Uploading images…" : dirty ? "Unsaved changes" : "No unsaved changes"}
        </p>
        <div className="flex gap-2">
          {mode === "draft" && (
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending || uploading}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                dirty ? "border-zinc-600 text-white hover:bg-zinc-800" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              Save draft
            </button>
          )}
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending || uploading}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
              dirty ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            {mode === "live" ? "Submit changes for approval" : mode === "pending" ? "Save changes" : "Submit for approval"}
          </button>
        </div>
      </div>

      {errorCount > 0 && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form ?? `Fix ${errorCount} ${errorCount === 1 ? "problem" : "problems"} below, then save again.`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>
                  Title
                </label>
                <input
                  id="title"
                  value={draft.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Short sleeve t-shirt"
                  aria-invalid={Boolean(errors.title)}
                  className={inputClass}
                />
                {errors.title && <p className={errorClass}>{errors.title}</p>}
              </div>
              <div>
                <p id="description-label" className={labelClass}>
                  Description
                </p>
                <RichTextEditor
                  labelledBy="description-label"
                  value={draft.descriptionHtml}
                  onChange={(html) => update("descriptionHtml", html)}
                  vendorId={vendorId}
                  placeholder="Describe the product: materials, fit, care, what makes it special…"
                  invalid={Boolean(errors.descriptionHtml)}
                />
                {errors.descriptionHtml && <p className={errorClass}>{errors.descriptionHtml}</p>}
              </div>
            </div>
          </Card>

          <Card title="Media">
            <MediaField
              vendorId={vendorId}
              urls={draft.imageUrls}
              onChange={(updateUrls) =>
                setDraft((current) => {
                  const imageUrls = updateUrls(current.imageUrls);
                  return {
                    ...current,
                    imageUrls,
                    // A variant can only use one of the product's images.
                    variants: current.variants.map((variant) =>
                      variant.imageUrl && !imageUrls.includes(variant.imageUrl) ? { ...variant, imageUrl: "" } : variant,
                    ),
                  };
                })
              }
              onUploadingChange={setUploading}
              error={errors.imageUrls}
            />
          </Card>

          {!withVariants && draft.variants[0] && (
            <>
              <Card title="Pricing">
                <PricingFields {...fieldProps} />
              </Card>
              <Card title="Inventory">
                <InventoryFields {...fieldProps} />
              </Card>
              <Card title="Shipping">
                <ShippingFields {...fieldProps} />
              </Card>
            </>
          )}

          <Card title="Variants">
            <div className="space-y-4">
              <OptionsEditor options={draft.options} errors={errors} onChange={setOptions} />
              {withVariants && (
                <VariantsTable
                  options={draft.options}
                  variants={draft.variants}
                  currencyCode={currencyCode}
                  errors={errors}
                  onPatch={patchVariants}
                  onDelete={deleteVariants}
                  onEdit={setEditingVariant}
                  onPickImage={setImagePickerFor}
                  onBulkEdit={setBulkIndices}
                />
              )}
            </div>
          </Card>

          <Card title="Search engine listing" description="How this product can appear in search results.">
            <SeoEditor
              title={draft.title}
              descriptionHtml={draft.descriptionHtml}
              fields={{ seoTitle: draft.seoTitle, seoDescription: draft.seoDescription, handle: draft.handle }}
              shopDomain={shopDomain}
              errors={errors}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Status">
            <p className="text-sm text-zinc-600">
              {mode === "live"
                ? "This product is live. Your changes don't touch the store's copy until the store approves them."
                : mode === "pending"
                  ? "The store is reviewing this product. Any changes you save now are part of what they review."
                  : "Save a draft anytime. When it's ready, submit it: the store reviews every product before it goes live."}
            </p>
          </Card>

          <Card title="Product organization">
            <div className="space-y-4">
              <div>
                <label htmlFor="productType" className={labelClass}>
                  Product type
                </label>
                <input
                  id="productType"
                  value={draft.productType}
                  onChange={(event) => update("productType", event.target.value)}
                  placeholder="T-shirt"
                  aria-invalid={Boolean(errors.productType)}
                  className={inputClass}
                />
                {errors.productType && <p className={errorClass}>{errors.productType}</p>}
              </div>
              <div>
                <label htmlFor="collections" className={labelClass}>
                  Collections
                </label>
                <CollectionPicker
                  id="collections"
                  collections={collections}
                  value={draft.collectionIds}
                  onChange={(collectionIds) => update("collectionIds", collectionIds)}
                  invalid={Boolean(errors.collectionIds)}
                />
                {errors.collectionIds && <p className={errorClass}>{errors.collectionIds}</p>}
              </div>
              <div>
                <label htmlFor="tags" className={labelClass}>
                  Tags
                </label>
                <TagInput
                  id="tags"
                  values={draft.tags}
                  onChange={(tags) => update("tags", tags)}
                  placeholder="Type a tag and press Enter"
                  invalid={Boolean(errors.tags)}
                />
                {errors.tags && <p className={errorClass}>{errors.tags}</p>}
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {editingVariant !== null && draft.variants[editingVariant] && (
        <VariantModal
          variant={draft.variants[editingVariant]}
          index={editingVariant}
          label={variantLabel(draft.variants[editingVariant].optionValues, draft.options)}
          options={draft.options}
          imageUrls={draft.imageUrls}
          currencyCode={currencyCode}
          errors={errors}
          onClose={() => setEditingVariant(null)}
          onDone={(variant) => {
            const index = editingVariant;
            setDraft((current) => ({
              ...current,
              variants: current.variants.map((existing, i) => (i === index ? variant : existing)),
            }));
            setEditingVariant(null);
          }}
        />
      )}

      {imagePickerFor !== null && draft.variants[imagePickerFor] && (
        <VariantImageModal
          variantLabel={variantLabel(draft.variants[imagePickerFor].optionValues, draft.options)}
          imageUrls={draft.imageUrls}
          selectedUrl={draft.variants[imagePickerFor].imageUrl}
          onClose={() => setImagePickerFor(null)}
          onDone={(url) => {
            patchVariants([imagePickerFor], { imageUrl: url });
            setImagePickerFor(null);
          }}
        />
      )}

      {bulkIndices && (
        <BulkEditModal
          count={bulkIndices.length}
          currencyCode={currencyCode}
          onClose={() => setBulkIndices(null)}
          onApply={(patch) => {
            patchVariants(bulkIndices, patch);
            setBulkIndices(null);
          }}
        />
      )}
    </form>
  );
}
