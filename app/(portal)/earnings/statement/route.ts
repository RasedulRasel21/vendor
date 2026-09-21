import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";

const TYPE: Record<string, string> = {
  SALE: "Sale",
  REFUND: "Refund",
  CANCELLATION: "Cancelled",
  ADJUSTMENT: "Adjustment",
  PAYOUT: "Payout",
  PAYOUT_REVERSAL: "Payout returned",
};

function cell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// A month's statement: what was owed going in, every movement, and what was owed coming
// out. The opening figure is everything before the month, so statements chain together.
export async function GET(request: Request) {
  const user = await requireVendorUser();

  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return new Response("Choose a month like 2026-09", { status: 400 });
  }

  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  const [before, entries] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: { vendorId: user.vendorId, createdAt: { lt: start } },
      _sum: { amount: true },
    }),
    db.ledgerEntry.findMany({
      where: { vendorId: user.vendorId, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      select: { type: true, amount: true, currencyCode: true, description: true, orderName: true, createdAt: true },
    }),
  ]);

  const opening = Number(before._sum.amount ?? 0);
  const currency = entries[0]?.currencyCode ?? "";
  let balance = opening;

  const rows = entries.map((entry) => {
    balance += Number(entry.amount);
    return [
      entry.createdAt.toISOString().slice(0, 10),
      TYPE[entry.type] ?? entry.type,
      entry.description,
      entry.orderName ?? "",
      Number(entry.amount).toFixed(2),
      balance.toFixed(2),
    ]
      .map(cell)
      .join(",");
  });

  const csv = [
    [cell("Statement"), cell(user.Vendor.name), cell(month)].join(","),
    [cell("Owed at the start"), cell(opening.toFixed(2)), cell(currency)].join(","),
    "",
    ["Date", "Type", "Description", "Order", "Amount", "Owed after"].map(cell).join(","),
    ...rows,
    "",
    [cell("Owed at the end"), cell(balance.toFixed(2)), cell(currency)].join(","),
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statement-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
