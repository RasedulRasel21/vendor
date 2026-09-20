const DAY = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// The store sets how long a vendor has to ship. Everything after that is late.
export function shipDeadline(placedAt: Date, days: number) {
  const dueAt = new Date(placedAt.getTime() + Math.max(1, days) * DAY);
  const lateDays = Math.floor((Date.now() - dueAt.getTime()) / DAY);

  return {
    dueAt,
    overdue: lateDays >= 0,
    lateDays: Math.max(0, lateDays),
    label:
      lateDays >= 0
        ? lateDays === 0
          ? "Due today"
          : `${lateDays} ${lateDays === 1 ? "day" : "days"} late`
        : `Ship by ${dateFormat.format(dueAt)}`,
  };
}

export function overdueCutoff(days: number) {
  return new Date(Date.now() - Math.max(1, days) * DAY);
}
