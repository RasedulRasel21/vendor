"use client";

import { useState } from "react";
import { MAX_IMAGES } from "@/lib/product-draft";
import { errorClass, inputClass, secondaryButtonClass } from "@/lib/ui";

const overlayButton =
  "rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40";

export function MediaLinks({
  urls,
  onChange,
  error,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  error?: string;
}) {
  const [link, setLink] = useState("");
  const [problem, setProblem] = useState("");

  const add = () => {
    const value = link.trim();
    if (!value) return;

    let valid = false;
    try {
      valid = new URL(value).protocol === "https:";
    } catch {
      valid = false;
    }

    if (!valid) setProblem("Use a full image link that starts with https://");
    else if (urls.includes(value)) setProblem("That image is already added");
    else {
      onChange([...urls, value].slice(0, MAX_IMAGES));
      setLink("");
      setProblem("");
    }
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {urls.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url, index) => (
            <li
              key={url}
              className={`group relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-zinc-900">
                  Main image
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)} className={overlayButton}>
                    ←
                  </button>
                  <button type="button" aria-label="Move later" disabled={index === urls.length - 1} onClick={() => move(index, 1)} className={overlayButton}>
                    →
                  </button>
                </div>
                <button type="button" onClick={() => onChange(urls.filter((item) => item !== url))} className={overlayButton}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          No images yet. Add an image link below; the first image is the main one.
        </div>
      )}

      <div className="flex gap-2">
        <input
          aria-label="Image link"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="https://…"
          disabled={urls.length >= MAX_IMAGES}
          className={inputClass}
        />
        <button type="button" onClick={add} disabled={urls.length >= MAX_IMAGES} className={`${secondaryButtonClass} shrink-0`}>
          Add image
        </button>
      </div>
      {(problem || error) && <p className={errorClass}>{problem || error}</p>}
    </div>
  );
}
