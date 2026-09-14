"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES } from "@/lib/product-draft";
import { errorClass, inputClass, secondaryButtonClass } from "@/lib/ui";
import { IMAGE_CONTENT_TYPES } from "@/lib/uploads";
import { MediaLibraryModal } from "./media-library-modal";
import { PendingUploads, useImageUploads } from "./use-image-uploads";

type UrlsUpdate = (current: string[]) => string[];

const tileButton =
  "rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40";

export function MediaField({
  vendorId,
  urls,
  onChange,
  onUploadingChange,
  error,
}: {
  vendorId: string;
  urls: string[];
  // Receives an updater so uploads that finish at the same time don't overwrite each other.
  onChange: (update: UrlsUpdate) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [problem, setProblem] = useState("");
  const { pending, uploading, uploadFiles, dismiss } = useImageUploads(vendorId);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const room = MAX_IMAGES - urls.length - pending.filter((item) => !item.error).length;

  const startUpload = (fileList: FileList) => {
    setProblem("");
    const files = Array.from(fileList);
    if (room <= 0) {
      setProblem(`You can add up to ${MAX_IMAGES} images`);
      return;
    }
    if (files.length > room) {
      setProblem(`Only ${room} more ${room === 1 ? "image" : "images"} can be added, so the rest were skipped`);
    }
    void uploadFiles(files.slice(0, room), (file) =>
      onChange((current) =>
        current.includes(file.url) ? current : [...current, file.url].slice(0, MAX_IMAGES),
      ),
    );
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length || from === to) return;
    onChange((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addLink = () => {
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
    else if (urls.length >= MAX_IMAGES) setProblem(`You can add up to ${MAX_IMAGES} images`);
    else {
      onChange((current) => [...current, value].slice(0, MAX_IMAGES));
      setLink("");
      setProblem("");
    }
  };

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      if (dragIndex !== null) return;
      event.preventDefault();
      setDropActive(true);
    },
    onDragLeave: () => setDropActive(false),
    onDrop: (event: React.DragEvent) => {
      if (dragIndex !== null) return;
      event.preventDefault();
      setDropActive(false);
      if (event.dataTransfer.files.length) startUpload(event.dataTransfer.files);
    },
  };

  return (
    <div className="space-y-4">
      {urls.length === 0 ? (
        <div
          {...dropHandlers}
          className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dropActive ? "border-primary-600 bg-zinc-50" : "border-zinc-300"
          }`}
        >
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButtonClass}>
              Upload new
            </button>
            <button type="button" onClick={() => setLibraryOpen(true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
              Select existing
            </button>
          </div>
          <p className="mt-2 text-sm text-zinc-500">Or drag and drop images · JPG, PNG, WebP or GIF up to 20 MB</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url, index) => (
            <li
              key={url}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`group relative cursor-grab overflow-hidden rounded-lg border bg-zinc-50 ${
                index === 0 ? "col-span-2 row-span-2" : ""
              } ${dragIndex === index ? "border-primary-600 opacity-60" : "border-zinc-200"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" draggable={false} className="aspect-square h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-zinc-900">
                  Main image
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, index - 1)} className={tileButton}>
                    ←
                  </button>
                  <button type="button" aria-label="Move later" disabled={index === urls.length - 1} onClick={() => move(index, index + 1)} className={tileButton}>
                    →
                  </button>
                </div>
                <button type="button" onClick={() => onChange((current) => current.filter((item) => item !== url))} className={tileButton}>
                  Remove
                </button>
              </div>
            </li>
          ))}
          {room > 0 && (
            <li {...dropHandlers}>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                aria-label="Add images"
                className={`flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed text-3xl text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-700 ${
                  dropActive ? "border-primary-600 bg-zinc-50 text-zinc-700" : "border-zinc-300"
                }`}
              >
                +
              </button>
            </li>
          )}
        </ul>
      )}

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

      <PendingUploads pending={pending} onDismiss={dismiss} />

      {showLink ? (
        <div className="flex gap-2">
          <input
            aria-label="Image link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLink();
              }
            }}
            placeholder="https://…"
            className={inputClass}
          />
          <button type="button" onClick={addLink} className={`${secondaryButtonClass} shrink-0`}>
            Add image
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowLink(true)} className="text-sm font-medium text-zinc-700 hover:underline">
          Add image from a link
        </button>
      )}

      {(problem || error) && <p className={errorClass}>{problem || error}</p>}

      {libraryOpen && (
        <MediaLibraryModal
          vendorId={vendorId}
          selectedUrls={urls}
          maxSelection={MAX_IMAGES}
          onClose={() => setLibraryOpen(false)}
          onDone={(selection) => {
            onChange(() => selection);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}
