"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/lib/ui";

export type CollectionOption = { collectionId: string; title: string; imageUrl: string | null };

// Shopify's collections field: search, tick collections in the list, selected ones show as chips.
export function CollectionPicker({
  id,
  collections,
  value,
  onChange,
  invalid,
}: {
  id: string;
  collections: CollectionOption[];
  value: string[];
  onChange: (collectionIds: string[]) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const term = query.trim().toLowerCase();
  const matches = collections.filter((collection) => !term || collection.title.toLowerCase().includes(term));
  const selected = value
    .map((collectionId) => collections.find((collection) => collection.collectionId === collectionId))
    .filter((collection): collection is CollectionOption => Boolean(collection));

  const toggle = (collectionId: string) =>
    onChange(value.includes(collectionId) ? value.filter((item) => item !== collectionId) : [...value, collectionId]);

  if (!collections.length) {
    return <p className="text-sm text-zinc-500">The store hasn&apos;t added any collections for vendors yet.</p>;
  }

  return (
    <div ref={ref} className="space-y-2">
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search collections"
          aria-invalid={invalid}
          className={inputClass}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
          >
            {matches.length ? (
              matches.map((collection) => {
                const checked = value.includes(collection.collectionId);
                return (
                  <li key={collection.collectionId} role="option" aria-selected={checked}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(collection.collectionId)}
                        className="size-4 accent-zinc-900"
                      />
                      {collection.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={collection.imageUrl} alt="" className="size-6 rounded object-cover" />
                      ) : (
                        <span aria-hidden className="size-6 rounded bg-zinc-100" />
                      )}
                      <span className="truncate">{collection.title}</span>
                    </label>
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-2 text-sm text-zinc-500">No collections match “{query.trim()}”</li>
            )}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected collections">
          {selected.map((collection) => (
            <li
              key={collection.collectionId}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 pl-2 pr-1 text-sm text-zinc-800"
            >
              {collection.title}
              <button
                type="button"
                aria-label={`Remove ${collection.title}`}
                onClick={() => toggle(collection.collectionId)}
                className="rounded px-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
