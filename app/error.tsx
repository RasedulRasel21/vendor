"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

// What a vendor sees when a page breaks. A blank screen makes people think they lost
// something; this says what happened, offers the one thing worth trying, and quietly tells
// the store app so somebody finds out without the vendor having to report it.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {
      // Nothing useful to do if even the report can't be sent.
    });
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-4 py-16">
      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-bold text-zinc-900">This page didn&apos;t load</h1>
        <p className="mt-2 text-zinc-600">
          Something went wrong at our end, not yours. Nothing you&apos;ve saved is affected, and
          the store has been told. Trying again usually works.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={primaryButtonClass}>
          <RotateCw className="size-4" aria-hidden />
          Try again
        </button>
        <a href="/dashboard" className={secondaryButtonClass}>
          Go to the dashboard
        </a>
      </div>
      {error.digest && (
        <p className="text-sm text-zinc-500">
          If you get in touch about this, quote <span className="font-mono">{error.digest}</span>.
        </p>
      )}
    </main>
  );
}
