import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const buttonClass =
  "inline-flex size-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50";
const disabledClass = "inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-300";

export type PageInfo = {
  current: number;
  from: number;
  to: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

// Paging keeps the filters that are already in the URL, so only the page number changes.
export function Pagination({ page, href }: { page: PageInfo; href: (page: number) => string }) {
  if (!page.hasPrevious && !page.hasNext) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-6 py-3 text-sm text-zinc-500">
      <p className="tabular-nums">{`${page.from}–${page.to} of ${page.total}`}</p>
      <div className="flex gap-2">
        {page.hasPrevious ? (
          <Link href={href(page.current - 1)} aria-label="Previous page" rel="prev" className={buttonClass}>
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={disabledClass}>
            <ChevronLeft className="size-4" />
          </span>
        )}
        {page.hasNext ? (
          <Link href={href(page.current + 1)} aria-label="Next page" rel="next" className={buttonClass}>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={disabledClass}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
