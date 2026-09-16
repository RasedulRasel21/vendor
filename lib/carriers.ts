import { db } from "@/lib/db";

// Carriers Shopify recognises for tracking, so it can build the tracking link itself.
// Keep this in step with app/utils/carriers.js in the StoreVendor app.
const GLOBAL_CARRIERS = [
  "4PX",
  "Amazon Logistics",
  "APC",
  "Aramex",
  "Asendia",
  "Australia Post",
  "Bluedart",
  "Bring",
  "BRT",
  "Canada Post",
  "China Post",
  "Chronopost",
  "Colissimo",
  "Correios",
  "Couriers Please",
  "DHL eCommerce",
  "DHL Express",
  "DHL Parcel",
  "DPD",
  "DTDC",
  "Ecom Express",
  "Evri",
  "FedEx",
  "GLS",
  "Globegistics",
  "Japan Post",
  "La Poste",
  "Newgistics",
  "PostNL",
  "PostNord",
  "Purolator",
  "Royal Mail",
  "Sagawa",
  "Sendle",
  "SF Express",
  "Singapore Post",
  "TNT",
  "Toll IPEC",
  "UPS",
  "USPS",
  "Whistl",
  "Yamato",
  "YunExpress",
];

const CARRIERS_BY_COUNTRY: Record<string, string[]> = {
  AU: ["Australia Post", "Sendle", "Aramex Australia", "TNT Australia", "Hunter Express", "Couriers Please", "Allied Express", "Direct Couriers", "Northline"],
  AT: ["Österreichische Post"],
  BG: ["Speedy"],
  CA: ["Intelcom", "BoxKnight", "Loomis", "GLS", "Canada Post", "Purolator"],
  CN: ["China Post", "DHL eCommerce Asia", "WanbExpress", "YunExpress", "Anjun Logistics", "SFC Fulfillment"],
  CZ: ["Zásilkovna"],
  DE: ["Deutsche Post", "DHL", "DHL Express", "Hermes", "GLS"],
  ES: ["SEUR", "Correos"],
  FR: ["Colissimo", "Mondial Relay", "Colis Privé", "GLS"],
  GB: ["Evri", "DPD UK", "Parcelforce", "Yodel", "DHL Parcel", "Tuffnells", "Royal Mail"],
  GR: ["ACS Courier"],
  HK: ["SF Express"],
  IE: ["Fastway", "DPD Ireland"],
  IN: ["DTDC", "India Post", "Delhivery", "Gati KWE", "Professional Couriers", "XpressBees", "Ecom Express", "Ekart", "Shadowfax", "Bluedart"],
  IT: ["BRT", "GLS Italy", "Poste Italiane"],
  JP: ["Japan Post", "Yamato", "Sagawa"],
  NL: ["DHL Parcel", "DPD", "PostNL"],
  NO: ["Bring"],
  PL: ["Inpost"],
  TR: ["PTT", "Yurtiçi Kargo", "Aras Kargo", "Sürat Kargo"],
  US: ["USPS", "UPS", "FedEx", "GLS", "Alliance Air Freight", "Pilot Freight", "LSO", "Old Dominion", "Pandion", "R+L Carriers", "Southwest Air Cargo"],
  ZA: ["Fastway", "Skynet"],
};

export function shopifyCarriers(countryCode: string | null) {
  const local = CARRIERS_BY_COUNTRY[countryCode ?? ""] ?? [];
  return [...new Set([...local, ...GLOBAL_CARRIERS])].sort((a, b) => a.localeCompare(b));
}

export type CarrierOptions = {
  fromShopify: string[];
  approved: { name: string; trackingUrlTemplate: string | null }[];
  request: { name: string; status: string; reviewNote: string | null } | null;
};

// What this vendor can pick from: the couriers Shopify knows in the store's country, plus the
// ones the store approved. Their own last request rides along so they can see where it got to.
export async function carrierOptions(shop: string, vendorId: string): Promise<CarrierOptions> {
  const [settings, carriers] = await Promise.all([
    db.shopSettings.findUnique({ where: { shop }, select: { countryCode: true } }),
    db.shopCarrier.findMany({
      where: { shop, OR: [{ status: "APPROVED" }, { requestedByVendorId: vendorId }] },
      orderBy: { name: "asc" },
      select: { name: true, trackingUrlTemplate: true, status: true, reviewNote: true, requestedByVendorId: true, updatedAt: true },
    }),
  ]);

  const fromShopify = shopifyCarriers(settings?.countryCode ?? null);
  const known = new Set(fromShopify.map((name) => name.toLowerCase()));
  const waiting = carriers
    .filter((carrier) => carrier.status !== "APPROVED" && carrier.requestedByVendorId === vendorId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  return {
    fromShopify,
    approved: carriers
      .filter((carrier) => carrier.status === "APPROVED" && !known.has(carrier.name.toLowerCase()))
      .map(({ name, trackingUrlTemplate }) => ({ name, trackingUrlTemplate })),
    request: waiting
      ? { name: waiting.name, status: waiting.status, reviewNote: waiting.reviewNote }
      : null,
  };
}
