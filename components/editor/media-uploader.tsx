"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES } from "@/lib/product-draft";
import { errorClass, inputClass, secondaryButtonClass } from "@/lib/ui";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, vendorImageFolder } from "@/lib/uploads";

type PendingUpload = { id: string; name: string; progress: number; error?: string };

type UrlsUpdate = (current: string[]) => string[];

const tileButton =
  "rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40";

function safeFileName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+/, "");
  return cleaned.slice(-80) || "image";
}

export function MediaUploader({
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
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [problem, setProblem] = useState("");

  const uploading = pending.some((item) => !item.error);
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const updatePending = (id: string, patch: Partial<PendingUpload>) =>
    setPending((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadFiles = async (fileList: FileList) => {
    setProblem("");
    const files = Array.from(fileList);
    const room = MAX_IMAGES - urls.length - pending.filter((item) => !item.error).length;

    if (room <= 0) {
      setProblem(`You can add up to ${MAX_IMAGES} images`);
      return;
    }
    if (files.length > room) {
      setProblem(`Only ${room} more ${room === 1 ? "image" : "images"} can be added, so the rest were skipped`);
    }

    await Promise.all(
      files.slice(0, room).map(async (file) => {
        const id = crypto.randomUUID();

        if (!IMAGE_CONTENT_TYPES.includes(file.type)) {
          setPending((current) => [...current, { id, name: file.name, progress: 0, error: "Use a JPG, PNG, WebP or GIF image" }]);
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setPending((current) => [...current, { id, name: file.name, progress: 0, error: "Images must be 20 MB or smaller" }]);
          return;
        }

        setPending((current) => [...current, { id, name: file.name, progress: 0 }]);

        try {
          const blob = await upload(`${vendorImageFolder(vendorId)}${safeFileName(file.name)}`, file, {
            access: "public",
            handleUploadUrl: "/api/uploads",
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => updatePending(id, { progress: percentage }),
          });

          onChange((current) =>
            current.includes(blob.url) ? current : [...current, blob.url].slice(0, MAX_IMAGES),
          );
          setPending((current) => current.filter((item) => item.id !== id));
        } catch {
          updatePending(id, { error: "Upload failed. Check your connection and try again." });
        }
      }),
    );
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

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length || from === to) return;
    onChange((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {urls.length > 0 && (
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
                event.stopPropagation();
                move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`group relative cursor-grab overflow-hidden rounded-lg border bg-zinc-50 ${
                index === 0 ? "col-span-2 row-span-2" : ""
              } ${dragIndex === index ? "border-zinc-900 opacity-60" : "border-zinc-200"}`}
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
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-zinc-800">{item.name}</span>
                {item.error ? (
                  <button
                    type="button"
                    onClick={() => setPending((current) => current.filter((entry) => entry.id !== item.id))}
                    className="shrink-0 text-xs font-medium text-zinc-600 hover:underline"
                  >
                    Dismiss
                  </button>
                ) : (
                  <span className="shrink-0 tabular-nums text-zinc-500">{Math.round(item.progress)}%</span>
                )}
              </div>
              {item.error ? (
                <p className="mt-1 text-xs text-red-700">{item.error}</p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-zinc-900 transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(event) => {
          if (dragIndex !== null) return;
          event.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          if (dragIndex !== null) return;
          event.preventDefault();
          setDropActive(false);
          if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dropActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-300"
        }`}
      >
        <p className="text-sm text-zinc-700">Drag images here, or</p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={urls.length >= MAX_IMAGES}
          className={`${secondaryButtonClass} mt-2`}
        >
          Upload images
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          {`JPG, PNG, WebP or GIF, up to 20 MB each. ${urls.length} of ${MAX_IMAGES} added; the first image is the main one.`}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_CONTENT_TYPES.join(",")}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

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
          Add image from a link instead
        </button>
      )}

      {(problem || error) && <p className={errorClass}>{problem || error}</p>}
    </div>
  );
}
