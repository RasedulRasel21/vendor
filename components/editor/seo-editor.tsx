"use client";

import { stripHtml } from "@/lib/product-draft";
import { slugify } from "@/lib/slug";
import { errorClass, inputClass, labelClass } from "@/lib/ui";

type SeoFields = { seoTitle: string; seoDescription: string; handle: string };

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs ${value.length > max ? "text-red-700" : "text-zinc-500"}`}>
      {`${value.length} of ${max} characters used`}
    </span>
  );
}

export function SeoEditor({
  title,
  descriptionHtml,
  fields,
  shopDomain,
  errors,
  onChange,
}: {
  title: string;
  descriptionHtml: string;
  fields: SeoFields;
  shopDomain: string;
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoFields>) => void;
}) {
  const previewTitle = fields.seoTitle.trim() || title.trim() || "Product title";
  const previewDescription =
    (fields.seoDescription.trim() || stripHtml(descriptionHtml)).slice(0, 160) ||
    "Add a description to see how this product might appear in search results.";
  const previewHandle = fields.handle.trim() || slugify(title) || "product";

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-500">Search result preview</p>
        <p className="mt-2 truncate text-sm text-zinc-600">{`${shopDomain} › products › ${previewHandle}`}</p>
        <p className="truncate text-lg text-blue-800">{previewTitle}</p>
        <p className="line-clamp-2 text-sm text-zinc-600">{previewDescription}</p>
      </div>

      <div>
        <label htmlFor="seoTitle" className={labelClass}>
          Page title
        </label>
        <input
          id="seoTitle"
          value={fields.seoTitle}
          onChange={(event) => onChange({ seoTitle: event.target.value })}
          placeholder={title || "Uses the product title"}
          aria-invalid={Boolean(errors.seoTitle)}
          className={inputClass}
        />
        <div className="mt-1 flex justify-between gap-2">
          {errors.seoTitle ? <p className={errorClass}>{errors.seoTitle}</p> : <span />}
          <Counter value={fields.seoTitle} max={70} />
        </div>
      </div>

      <div>
        <label htmlFor="seoDescription" className={labelClass}>
          Meta description
        </label>
        <textarea
          id="seoDescription"
          rows={3}
          value={fields.seoDescription}
          onChange={(event) => onChange({ seoDescription: event.target.value })}
          placeholder="Uses the start of the product description"
          aria-invalid={Boolean(errors.seoDescription)}
          className={inputClass}
        />
        <div className="mt-1 flex justify-between gap-2">
          {errors.seoDescription ? <p className={errorClass}>{errors.seoDescription}</p> : <span />}
          <Counter value={fields.seoDescription} max={320} />
        </div>
      </div>

      <div>
        <label htmlFor="handle" className={labelClass}>
          URL handle
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-300 shadow-sm focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10">
          <span className="flex items-center bg-zinc-50 px-3 text-sm text-zinc-500">/products/</span>
          <input
            id="handle"
            value={fields.handle}
            onChange={(event) => onChange({ handle: event.target.value.toLowerCase() })}
            onBlur={() => onChange({ handle: slugify(fields.handle) })}
            placeholder={slugify(title) || "created-from-the-title"}
            aria-invalid={Boolean(errors.handle)}
            className="min-w-0 flex-1 px-2 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
        {errors.handle && <p className={errorClass}>{errors.handle}</p>}
      </div>
    </div>
  );
}
