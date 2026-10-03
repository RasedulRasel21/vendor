import { db } from "@/lib/db";

// What the store's plan switches on in here.
//
// The portal never talks to Shopify and never asks about billing. The store app reads the
// subscription from the Partner API and writes the answer onto the shop's settings row;
// this reads that row. So a merchant changing plan reaches the portal within a quarter of
// an hour, without the portal knowing anything about subscriptions.
//
// Mirrors app/utils/plans.js in the store app. Keep the two in step.

export const FEATURES = {
  PAYOUT_RAILS: "payout-rails",
  COD: "cod",
  INVOICES: "invoices",
  AGREEMENT: "agreement",
  VENDOR_STAFF: "vendor-staff",
  BULK_TOOLS: "bulk-tools",
  TAX_REPORTING: "tax-reporting",
  PAYOUT_FX: "payout-fx",
  LABELS: "labels",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const GROWTH: Feature[] = [
  FEATURES.PAYOUT_RAILS,
  FEATURES.COD,
  FEATURES.INVOICES,
  FEATURES.AGREEMENT,
  FEATURES.VENDOR_STAFF,
  FEATURES.BULK_TOOLS,
];

const PLANS: Record<string, { name: string; features: Feature[] }> = {
  STARTER: { name: "Starter", features: [] },
  GROWTH: { name: "Growth", features: GROWTH },
  SCALE: {
    name: "Scale",
    features: [...GROWTH, FEATURES.TAX_REPORTING, FEATURES.PAYOUT_FX, FEATURES.LABELS],
  },
};

export type StorePlan = {
  key: string;
  name: string;
  features: Feature[];
  has: (feature: Feature) => boolean;
};

function build(key: string | null | undefined): StorePlan {
  const plan = key ? PLANS[key] : undefined;
  const features = plan?.features ?? [];

  return {
    key: key ?? "NONE",
    name: plan?.name ?? "No plan",
    features,
    has: (feature: Feature) => features.includes(feature),
  };
}

/**
 * The plan the store this vendor sells for is on.
 *
 * A store with no plan is treated as Starter rather than as nothing: the vendor didn't
 * choose that, and their orders still need packing while the merchant sorts their billing
 * out. What a lapsed plan takes away is the extras, not the day's work.
 */
export async function storePlan(shop: string): Promise<StorePlan> {
  const settings = await db.shopSettings.findUnique({
    where: { shop },
    select: { plan: true },
  });

  if (!settings || settings.plan === "NONE" || !PLANS[settings.plan]) return build("STARTER");
  return build(settings.plan);
}

// A vendor shouldn't be told about the store's billing: it isn't their business and they
// can do nothing about it. They are told the store doesn't have the feature.
export const NOT_INCLUDED = "This store's plan doesn't include this. Ask the store about it.";
