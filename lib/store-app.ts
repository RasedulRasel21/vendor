// Used from server actions only: it carries the shared secret, so it must never reach the browser.
function bridge() {
  const appUrl = process.env.STORE_APP_URL;
  const secret = process.env.PORTAL_SYNC_SECRET;
  if (!appUrl || !secret) return null;
  return { appUrl: appUrl.replace(/\/$/, ""), secret };
}

export type PayoutSummary = {
  pending: number;
  available: number;
  inFlight: number;
  paid: number;
  currencyCode: string;
  holdDays: number;
  minimum: number;
  requestsAllowed: boolean;
  hasPayoutDetails: boolean;
  openPayout: { status: string; amount: number } | null;
  canRequest: boolean;
};

async function payoutsCall<T>(body: Record<string, string>): Promise<T | { error: string }> {
  const config = bridge();
  if (!config) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing");
    return { error: "Earnings aren't set up yet. Contact the store." };
  }

  try {
    const response = await fetch(`${config.appUrl}/api/portal/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (response.ok && result && !result.error) return result;
    return { error: result?.error ?? "The store couldn't be reached. Try again." };
  } catch (error) {
    console.error("Payouts request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
}

// Balances are worked out by the store app, next to the ledger, so both sides always agree.
export function payoutSummary(vendorId: string) {
  return payoutsCall<PayoutSummary>({ vendorId, intent: "balance" });
}

export function askForPayout(vendorId: string, actor: string) {
  return payoutsCall<{ ok: true; amount: number; currencyCode: string }>({ vendorId, intent: "request", actor });
}

// Approving, declining and restocking all happen in Shopify, so they go through the app the
// same way shipping does.
export async function requestReturnAction(input: {
  vendorReturnId: string;
  vendorId: string;
  intent: "approve" | "decline" | "restock";
  reason?: string;
  note?: string;
}): Promise<{ ok: true; units?: number; location?: string } | { error: string }> {
  const config = bridge();
  if (!config) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing");
    return { error: "Returns aren't set up yet. Contact the store." };
  }

  try {
    const response = await fetch(`${config.appUrl}/api/portal/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: true; units?: number; location?: string; error?: string }
      | null;

    if (response.ok && result?.ok) return { ok: true, units: result.units, location: result.location };
    return { error: result?.error ?? "The store couldn't do that. Try again." };
  } catch (error) {
    console.error("Return request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
}

// The portal has no Shopify access, so shipping goes through the StoreVendor app,
// which calls Shopify with the store's own credentials. Both sides share a secret.
export async function requestFulfillment(input: {
  vendorOrderId: string;
  vendorId: string;
  trackingNumber: string;
  trackingCompany: string;
  trackingUrl: string;
  // Empty means everything still to send.
  items: { lineId: string; quantity: number }[];
}): Promise<{ ok: true } | { error: string }> {
  const appUrl = process.env.STORE_APP_URL;
  const secret = process.env.PORTAL_SYNC_SECRET;
  if (!appUrl || !secret) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing");
    return { error: "Shipping isn't set up yet. Contact the store." };
  }

  try {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/portal/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": secret },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as { ok?: true; error?: string } | null;

    if (response.ok && result?.ok) return { ok: true };
    return { error: result?.error ?? "The store couldn't mark this shipped. Try again." };
  } catch (error) {
    console.error("Fulfillment request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
}
