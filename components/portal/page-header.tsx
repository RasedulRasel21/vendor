import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  back,
  meta,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 mb-3 inline-flex items-center gap-0.5 rounded-md px-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[2rem]">
              {title}
            </h1>
            {meta}
          </div>
          {description && <p className="mt-1.5 max-w-2xl text-[0.95rem] text-zinc-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
