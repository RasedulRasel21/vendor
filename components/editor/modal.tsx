"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// A dialog rendered into document.body, so it can't submit the product form it opens from.
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
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
      className={`m-auto overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/50 ${
        size === "lg" ? "w-[min(52rem,calc(100vw-2rem))]" : "w-[min(34rem,calc(100vw-2rem))]"
      }`}
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
          <h2 id={titleId} className="truncate font-semibold text-zinc-900">
            {title}
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
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3">{footer}</footer>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
