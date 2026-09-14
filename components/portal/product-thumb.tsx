import { Package } from "lucide-react";

export function ProductThumb({ src, size = "md" }: { src?: string | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-10" : "size-12";

  if (!src) {
    return (
      <span aria-hidden className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400`}>
        <Package className="size-5" strokeWidth={1.5} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={`${box} shrink-0 rounded-lg border border-zinc-200 bg-white object-cover`} />
  );
}
