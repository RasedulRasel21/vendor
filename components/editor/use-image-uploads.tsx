"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import {
  IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  vendorImageFolder,
  type MediaFile,
} from "@/lib/uploads";

export type PendingUpload = { id: string; name: string; progress: number; error?: string };

function safeFileName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+/, "");
  return cleaned.slice(-80) || "image";
}

// Uploads images straight from the browser to the vendor's Blob folder.
export function useImageUploads(vendorId: string) {
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const updatePending = (id: string, patch: Partial<PendingUpload>) =>
    setPending((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const dismiss = (id: string) => setPending((current) => current.filter((item) => item.id !== id));

  const uploadFiles = async (files: File[], onUploaded: (file: MediaFile) => void) => {
    const folder = vendorImageFolder(vendorId);

    await Promise.all(
      files.map(async (file) => {
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
          const blob = await upload(`${folder}${safeFileName(file.name)}`, file, {
            access: "public",
            handleUploadUrl: "/api/uploads",
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => updatePending(id, { progress: percentage }),
          });

          onUploaded({
            url: blob.url,
            name: blob.pathname.slice(folder.length),
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
          dismiss(id);
        } catch {
          updatePending(id, { error: "Upload failed. Check your connection and try again." });
        }
      }),
    );
  };

  return { pending, uploading: pending.some((item) => !item.error), uploadFiles, dismiss };
}

export function PendingUploads({
  pending,
  onDismiss,
}: {
  pending: PendingUpload[];
  onDismiss: (id: string) => void;
}) {
  if (!pending.length) return null;

  return (
    <ul className="space-y-2">
      {pending.map((item) => (
        <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-zinc-800">{item.name}</span>
            {item.error ? (
              <button type="button" onClick={() => onDismiss(item.id)} className="shrink-0 text-xs font-medium text-zinc-600 hover:underline">
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
              <div className="h-full bg-primary-600 transition-all" style={{ width: `${item.progress}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
