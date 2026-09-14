export function Card({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface p-5 sm:p-6">
      {title && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
