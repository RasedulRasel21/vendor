"use client";

import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { secondaryButtonClass } from "@/lib/ui";
import { deleteProduct, duplicateProduct } from "../actions";

type Props = {
  submissionId: string;
  // Only a draft or a product the store sent back is the vendor's alone to delete.
  canDelete: boolean;
  status: string;
};

const WHY_NOT: Record<string, string> = {
  PENDING: "The store is looking at this one. You can delete it if they send it back.",
  APPROVED: "This is on sale in the store. Ask the store to take it down.",
};

export function ProductActions({ submissionId, canDelete, status }: Props) {
  const [confirming, setConfirming] = useState(false);

  const duplicate = duplicateProduct.bind(null, submissionId);
  const remove = deleteProduct.bind(null, submissionId);

  return (
    <section className="mt-8 border-t border-zinc-200 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <form action={duplicate}>
          <button type="submit" className={secondaryButtonClass}>
            <Copy className="size-4" aria-hidden />
            Duplicate
          </button>
        </form>

        {canDelete && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${secondaryButtonClass} text-red-700`}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </button>
        )}

        {canDelete && confirming && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="text-sm text-red-800">Delete this for good?</span>
            <form action={remove}>
              <button
                type="submit"
                className={`${secondaryButtonClass} border-red-300 bg-white text-red-700`}
              >
                Yes, delete
              </button>
            </form>
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButtonClass}>
              Keep it
            </button>
          </div>
        )}

        {!canDelete && <p className="text-sm text-zinc-500">{WHY_NOT[status]}</p>}
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        A copy is always a new draft, so nothing about this product changes and nobody sees
        the copy until you submit it.
      </p>
    </section>
  );
}
