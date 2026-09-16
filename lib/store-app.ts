// Used from server actions only: it carries the shared secret, so it must never reach the browser.
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
