export function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {title && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
