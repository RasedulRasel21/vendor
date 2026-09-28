import { db } from "@/lib/db";

// What to call the store in front of a vendor. Its legal name once the merchant has set
// one up for invoices, the shop's own name if not, and the handle out of the myshopify
// domain as a last resort — never "the store", which reads like the software talking.
export async function storeName(shop: string) {
  const settings = await db.shopSettings.findUnique({
    where: { shop },
    select: { businessName: true, shopName: true },
  });

  return settings?.businessName || settings?.shopName || shop.replace(/\.myshopify\.com$/, "");
}
