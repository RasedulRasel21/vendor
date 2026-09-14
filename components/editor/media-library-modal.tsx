"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listVendorMedia } from "@/lib/media-actions";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { formatBytes, IMAGE_CONTENT_TYPES, imageTypeLabel, type MediaFile } from "@/lib/uploads";
import { PendingUploads, useImageUploads } from "./use-image-uploads";

type SortKey = "newest" | "oldest" | "name" | "size";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "File name A–Z" },
  { value: "size", label: "Largest first" },
];

function nameFromUrl(url: string) {
  return decodeURIComponent(url.split("?")[0].split("/").pop() ?? "") || "Image";
}

// Rendered into document.body so its buttons and search box can't submit the product form.
export function MediaLibraryModal({
  vendorId,
  selectedUrls,
  maxSelection,
  onClose,
  onDone,
}: {
  vendorId: string;
  selectedUrls: string[];
  maxSelection: number;
  onClose: () => void;
  onDone: (urls: string[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<string[]>(selectedUrls);
  const [dropActive, setDropActive] = useState(false);
  const { pending, uploading, uploadFiles, dismiss } = useImageUploads(vendorId);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;
    listVendorMedia()
      .then((result) => {
        if (!active) return;
        setFiles(result.files);
        setCursor(result.cursor);
      })
      .catch(() => {
        if (active) setMessage("Your files couldn't be loaded. Close this window and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await listVendorMedia(cursor);
      setFiles((current) => [
        ...current,
        ...result.files.filter((file) => !current.some((existing) => existing.url === file.url)),
      ]);
      setCursor(result.cursor);
    } catch {
      setMessage("More files couldn't be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (url: string) => {
    if (selected.includes(url)) {
      setSelected(selected.filter((item) => item !== url));
      setMessage("");
    } else if (selected.length >= maxSelection) {
      setMessage(`You can select up to ${maxSelection} images`);
    } else {
      setSelected([...selected, url]);
    }
  };

  const startUpload = (fileList: FileList) => {
    setMessage("");
    void uploadFiles(Array.from(fileList), (file) => {
      setFiles((current) => [file, ...current.filter((existing) => existing.url !== file.url)]);
      setSelected((current) =>
        current.includes(file.url) || current.length >= maxSelection ? current : [...current, file.url],
      );
    });
  };

  const visibleFiles = useMemo(() => {
    // Images added by link aren't in the library, but stay visible so they can be deselected.
    const linked = selectedUrls
      .filter((url) => !files.some((file) => file.url === url))
      .map((url) => ({ url, name: nameFromUrl(url), size: 0, uploadedAt: "" }));
    const term = query.trim().toLowerCase();
    const matching = [...files, ...linked].filter((file) => !term || file.name.toLowerCase().includes(term));

    return matching.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return b.size - a.size;
      if (sort === "oldest") return a.uploadedAt.localeCompare(b.uploadedAt);
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
  }, [files, query, sort, selectedUrls]);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="media-library-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(64rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 id="media-library-title" className="font-semibold text-zinc-900">
            Select images
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              aria-label="Search files"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              className={`${inputClass} min-w-48 flex-1`}
            />
            <select
              aria-label="Sort files"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className={`${inputClass} w-auto`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDropActive(false);
              if (event.dataTransfer.files.length) startUpload(event.dataTransfer.files);
            }}
            className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dropActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-300"
            }`}
          >
            <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButtonClass}>
              + Add files
            </button>
            <p className="mt-2 text-sm text-zinc-500">Drag and drop images · JPG, PNG, WebP or GIF up to 20 MB</p>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_CONTENT_TYPES.join(",")}
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files?.length) startUpload(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <PendingUploads pending={pending} onDismiss={dismiss} />

          {message && <p className="text-sm text-red-700">{message}</p>}

          {loading && files.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading your files…</p>
          ) : visibleFiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {query ? "No files match your search." : "No files yet. Upload images to start your library."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {visibleFiles.map((file) => {
                const position = selected.indexOf(file.url);
                const checked = position !== -1;
                return (
                  <li key={file.url}>
                    <button
                      type="button"
                      onClick={() => toggle(file.url)}
                      aria-pressed={checked}
                      aria-label={`${checked ? "Deselect" : "Select"} ${file.name}`}
                      className={`relative block w-full rounded-lg border-2 p-1 text-left ${
                        checked ? "border-zinc-900" : "border-transparent hover:border-zinc-300"
                      }`}
                    >
                      <span
                        className={`absolute left-2 top-2 flex size-5 items-center justify-center rounded border text-xs font-semibold ${
                          checked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-400 bg-white"
                        }`}
                      >
                        {checked ? position + 1 : ""}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file.url} alt="" loading="lazy" className="aspect-square w-full rounded-md bg-zinc-100 object-contain" />
                      <span className="mt-1 block truncate text-xs text-zinc-800">{file.name}</span>
                      <span className="block text-xs text-zinc-500">
                        {imageTypeLabel(file.name)}
                        {file.size ? ` · ${formatBytes(file.size)}` : " · Link"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cursor && (
            <div className="text-center">
              <button type="button" onClick={loadMore} disabled={loading} className={secondaryButtonClass}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3">
          <p className="text-sm text-zinc-600">
            {uploading ? "Uploading…" : `${selected.length} selected`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDone(selected)}
              disabled={uploading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
