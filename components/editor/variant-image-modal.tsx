"use client";

import { useState } from "react";
import { secondaryButtonClass } from "@/lib/ui";
import { Modal } from "./modal";

// Like Shopify, a variant image is chosen from the product's own images.
export function VariantImageModal({
  variantLabel,
  imageUrls,
  selectedUrl,
  onClose,
  onDone,
}: {
  variantLabel: string;
  imageUrls: string[];
  selectedUrl: string;
  onClose: () => void;
  onDone: (url: string) => void;
}) {
  const [selected, setSelected] = useState(selectedUrl);

  return (
    <Modal
      title={`Update image for ${variantLabel}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDone(selected)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Done
          </button>
        </>
      }
    >
      {imageUrls.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {imageUrls.map((url) => {
            const checked = selected === url;
            return (
              <li key={url}>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => setSelected(checked ? "" : url)}
                  className={`relative block w-full overflow-hidden rounded-lg border-2 ${
                    checked ? "border-primary-600" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  {checked && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">
          This product has no images yet. Add images in the Media section first, then pick one for this variant.
        </p>
      )}
    </Modal>
  );
}
