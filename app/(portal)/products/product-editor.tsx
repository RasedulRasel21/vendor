"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/editor/card";
import { MediaLinks } from "@/components/editor/media-links";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { SeoEditor } from "@/components/editor/seo-editor";
import { TagInput } from "@/components/editor/tag-input";
import { VariantsEditor } from "@/components/editor/variants-editor";
import type { ProductDraft } from "@/lib/product-draft";
import { errorClass, inputClass, labelClass } from "@/lib/ui";
import { saveProduct, type ProductEditorState } from "./actions";

const initialState: ProductEditorState = {};

export function ProductEditor({
  submissionId,
  initialDraft,
  shopDomain,
}: {
  submissionId: string | null;
  initialDraft: ProductDraft;
  shopDomain: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [state, formAction, pending] = useActionState(
    saveProduct.bind(null, submissionId),
    initialState,
  );

  const errors = state.errors ?? {};
  const errorCount = Object.keys(errors).length;
  const payload = JSON.stringify(draft);
  const savedPayload = useMemo(() => JSON.stringify(initialDraft), [initialDraft]);
  const dirty = payload !== savedPayload;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />

      <div
        className={`sticky top-0 z-20 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 transition-colors ${
          dirty ? "border-zinc-800 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-600"
        }`}
      >
        <p className="text-sm font-medium">
          {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
              dirty
                ? "border-zinc-600 text-white hover:bg-zinc-800"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
            }`}
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
              dirty ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-700"
            }`}
          >
            Submit for approval
          </button>
        </div>
      </div>

      {errorCount > 0 && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form ??
            `Fix ${errorCount} ${errorCount === 1 ? "problem" : "problems"} below, then save again.`}
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
                  placeholder="Describe the product: materials, fit, care, what makes it special…"
                  invalid={Boolean(errors.descriptionHtml)}
                />
                {errors.descriptionHtml && <p className={errorClass}>{errors.descriptionHtml}</p>}
              </div>
            </div>
          </Card>

          <Card title="Media">
            <MediaLinks
              urls={draft.imageUrls}
              onChange={(urls) => update("imageUrls", urls)}
              error={errors.imageUrls}
            />
          </Card>

          <Card title="Pricing and variants">
            <VariantsEditor
              options={draft.options}
              variants={draft.variants}
              trackInventory={draft.trackInventory}
              errors={errors}
              onChange={({ options, variants }) =>
                setDraft((current) => ({ ...current, options, variants }))
              }
            />
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
              Save a draft anytime. When it&apos;s ready, submit it: the store reviews every
              product before it goes live.
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

          <Card title="Inventory">
            <label className="flex items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={draft.trackInventory}
                onChange={(event) => update("trackInventory", event.target.checked)}
                className="mt-0.5 size-4 accent-zinc-900"
              />
              <span>
                Track quantity
                <span className="block text-zinc-500">Enter how many of each variant you have.</span>
              </span>
            </label>
          </Card>
        </aside>
      </div>
    </form>
  );
}
