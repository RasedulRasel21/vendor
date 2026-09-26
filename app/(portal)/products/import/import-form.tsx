"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Upload } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { importProducts, type ImportState } from "../actions";

const initialState: ImportState = {};

export function ImportForm() {
  const [state, formAction, importing] = useActionState(importProducts, initialState);
  const [fileName, setFileName] = useState("");

  const added = (state.created ?? 0) + (state.updated ?? 0);
  const done = added > 0 || (state.problems?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <form action={formAction} className="card-surface space-y-5 p-5 sm:p-6">
        {state.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {state.error}
          </p>
        )}

        <div>
          <label htmlFor="file" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Your CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            className="block w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-700 file:mr-3 file:rounded-l-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200"
          />
          {fileName && <p className="mt-1.5 text-sm text-zinc-500">{fileName}</p>}
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="submit"
            className="mt-0.5 size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            Send these to the store for approval instead of keeping them as drafts.
            <span className="mt-0.5 block text-zinc-500">
              Every product then has to be complete — a price on each variant, and whatever
              else the store asks for.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={importing} className={primaryButtonClass}>
            <Upload className="size-4" aria-hidden />
            {importing ? "Reading…" : "Upload"}
          </button>
          {/* A file to save, not a page to open: Link would navigate instead of downloading. */}
          <a href="/products/export" download className={secondaryButtonClass}>
            Download what I have
          </a>
        </div>
      </form>

      {done && (
        <div className="card-surface space-y-4 p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-zinc-900">What happened</h2>

          {added > 0 ? (
            <p className="flex items-start gap-2 text-sm text-primary-700">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              <span>
                {state.created ? `${state.created} added` : ""}
                {state.created && state.updated ? ", " : ""}
                {state.updated ? `${state.updated} updated` : ""}
                {state.submitted ? " — sent to the store for approval." : " — all as drafts."}{" "}
                <Link
                  href={state.submitted ? "/products?status=PENDING" : "/products?status=DRAFT"}
                  className="font-semibold underline underline-offset-4"
                >
                  {state.submitted ? "See them" : "Look them over"}
                </Link>
                {state.submitted ? "" : " before you submit them."}
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-600">Nothing was added.</p>
          )}

          {(state.problems?.length ?? 0) > 0 && (
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <CircleAlert className="size-4 text-amber-600" aria-hidden />
                {state.problems!.length === 1 ? "1 thing to fix" : `${state.problems!.length} things to fix`}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                {state.problems!.slice(0, 50).map((problem, i) => (
                  <li key={`${problem.line}-${i}`} className="rounded-lg bg-zinc-50 px-3 py-2">
                    {problem.line ? <span className="font-medium text-zinc-900">Row {problem.line}: </span> : null}
                    {problem.product ? <span className="text-zinc-900">{problem.product} — </span> : null}
                    {problem.message}
                  </li>
                ))}
              </ul>
              {state.problems!.length > 50 && (
                <p className="mt-2 text-sm text-zinc-500">…and {state.problems!.length - 50} more.</p>
              )}
              <p className="mt-3 text-sm text-zinc-500">
                Fix those rows and upload the same file again. Anything already added will be
                updated rather than added twice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
