"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// A dialog rendered into document.body, so it can't submit the product form it opens from.
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={`m-auto overflow-hidden rounded-2xl bg-white p-0 text-zinc-900 shadow-2xl shadow-zinc-900/15 backdrop:bg-zinc-900/40 backdrop:backdrop-blur-[2px] ${
        size === "lg" ? "w-[min(52rem,calc(100vw-2rem))]" : "w-[min(34rem,calc(100vw-2rem))]"
      }`}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold leading-snug">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto border-t border-zinc-100 px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
