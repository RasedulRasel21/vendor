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
  // Already worded by the store app, like "7 days" or "1 month".
  hold: string;
  minimum: number;
  requestsAllowed: boolean;
  hasPayoutDetails: boolean;
  openPayout: { status: string; amount: number } | null;
  // Set while payouts are paused after this vendor's payout details changed, as an ISO
  // date: the window in which a change nobody meant to make can still be stopped.
  payoutChangeHold: string | null;
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

export type StripeStatus = {
  available: boolean;
  // Whether the store can also send PayPal payouts automatically.
  paypal?: boolean;
  accountId?: string | null;
  detailsSubmitted?: boolean;
  transfersActive?: boolean;
};

async function stripeCall<T>(body: Record<string, string>): Promise<T | { error: string }> {
  const config = bridge();
  if (!config) return { error: "Stripe isn't set up yet. Contact the store." };

  try {
    const response = await fetch(`${config.appUrl}/api/portal/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (response.ok && result && !result.error) return result;
    return { error: result?.error ?? "The store couldn't reach Stripe. Try again." };
  } catch (error) {
    console.error("Stripe request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
}

// Whether the store takes Stripe, and how far this vendor's Stripe account has got.
export function stripeStatus(vendorId: string) {
  return stripeCall<StripeStatus>({ vendorId, intent: "status" });
}

export function stripeOnboardingUrl(vendorId: string) {
  return stripeCall<{ url: string }>({ vendorId, intent: "onboard" });
}

// Tax IDs are encrypted by the store app, which holds the key; the portal never stores one.
export async function saveTaxDetails(
  vendorId: string,
  actor: string,
  fields: Record<string, string>,
): Promise<{ ok: true } | { errors: Record<string, string> } | { error: string }> {
  const config = bridge();
  if (!config) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing");
    return { error: "Tax details can't be saved yet. Contact the store." };
  }

  try {
    const response = await fetch(`${config.appUrl}/api/portal/tax`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify({ vendorId, actor, fields }),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: true; errors?: Record<string, string>; error?: string }
      | null;
    if (response.ok && result?.ok) return { ok: true };
    if (result?.errors) return { errors: result.errors };
    return { error: result?.error ?? "The store couldn't save that. Try again." };
  } catch (error) {
    console.error("Tax details request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
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

export type ApplicationForm = {
  storeName: string;
  open: boolean;
  intro: string | null;
  termsUrl: string | null;
  catalogueSizes: { value: string; label: string }[];
};

export type ApplicationInput = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  countryCode: string;
  website: string;
  sells: string;
  catalogueSize: string;
  message: string;
  agreedTerms: boolean;
  // A field no person can see. Anything that fills it in is filling in every field.
  website2: string;
};

// The "sell with us" page is public, so the store it belongs to is found by a handle and
// nothing else about that store is exposed. The app decides what to do with what's sent:
// the portal only draws the form and passes it on.
async function applyCall<T>(body: Record<string, unknown>): Promise<T | { error: string }> {
  const config = bridge();
  if (!config) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing");
    return { error: "Applications aren't set up yet." };
  }

  try {
    const response = await fetch(`${config.appUrl}/api/portal/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | (T & { error?: string; errors?: Record<string, string> })
      | null;
    if (response.status === 404) return { error: "notFound" };
    if (response.ok && result && !result.error) return result;
    if (result?.errors) return result as T;
    return { error: result?.error ?? "The store couldn't be reached. Try again." };
  } catch (error) {
    console.error("Application request failed", error);
    return { error: "The store couldn't be reached. Try again in a moment." };
  }
}

export function applicationForm(handle: string) {
  return applyCall<ApplicationForm>({ handle, intent: "form" });
}

export function sendApplication(
  handle: string,
  application: ApplicationInput,
  meta: { ip: string | null; elapsedMs?: number },
) {
  return applyCall<{ ok: true; errors?: Record<string, string> }>({
    handle,
    intent: "submit",
    application,
    ip: meta.ip,
    elapsedMs: meta.elapsedMs,
  });
}

// The store's own rules about what a product needs. Asked at the moment a vendor
// submits, so they're told what this shop wants instead of having it sent back. The
// rules live in the store app and are applied there, so the vendor and the merchant are
// never looking at two different versions of them.
export async function checkProductRules(
  vendorId: string,
  submissionId: string | null,
  product: { title: string; descriptionHtml: string; productType: string; imageUrls: string[] },
): Promise<{ problems: string[] }> {
  const config = bridge();
  // Without the bridge there's nothing to check against; a vendor shouldn't be stopped
  // from working because a setting is missing on the server.
  if (!config) return { problems: [] };

  try {
    const response = await fetch(`${config.appUrl}/api/portal/product-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify({ vendorId, submissionId, product }),
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as { problems?: string[] } | null;
    return { problems: response.ok && Array.isArray(result?.problems) ? result.problems : [] };
  } catch (error) {
    console.error("Product rule check failed", error);
    return { problems: [] };
  }
}

export type VendorPermissions = {
  canCreateProducts: boolean;
  canSeeCustomerContact: boolean;
  autoApproveProducts: boolean;
};

// Everything a vendor is allowed to do is decided by the merchant and kept in the store
// app. When it can't be reached the portal assumes the ordinary case — able to work,
// nothing auto-approved — because the app is the one that actually enforces anything
// that matters.
const ASSUMED: VendorPermissions = {
  canCreateProducts: true,
  canSeeCustomerContact: true,
  autoApproveProducts: false,
};

async function permissionsCall(body: Record<string, unknown>) {
  const config = bridge();
  if (!config) return null;

  try {
    const response = await fetch(`${config.appUrl}/api/portal/vendor-permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as Record<string, unknown> | null;
  } catch (error) {
    console.error("Vendor permission request failed", error);
    return null;
  }
}

export async function vendorPermissions(vendorId: string): Promise<VendorPermissions> {
  const result = await permissionsCall({ vendorId, intent: "permissions" });
  if (!result) return ASSUMED;

  return {
    canCreateProducts: result.canCreateProducts !== false,
    canSeeCustomerContact: result.canSeeCustomerContact !== false,
    autoApproveProducts: result.autoApproveProducts === true,
  };
}

// Told after a vendor submits. A trusted vendor's new product goes into the store there
// and then; everyone else is simply waiting for the merchant, as before.
export async function productSubmitted(vendorId: string, submissionId: string): Promise<boolean> {
  const result = await permissionsCall({ vendorId, submissionId, intent: "submitted" });
  return result?.approved === true;
}

export type OwedAgreement = { id: string; version: number; title: string; body: string };

// The store's terms. Written, versioned and recorded in the store app; the portal shows
// them and passes back what was signed.
async function agreementCall(body: Record<string, unknown>) {
  const config = bridge();
  if (!config) return null;

  try {
    const response = await fetch(`${config.appUrl}/api/portal/agreement`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return (await response.json().catch(() => null)) as Record<string, unknown> | null;
  } catch (error) {
    console.error("Agreement request failed", error);
    return null;
  }
}

// What this vendor still has to agree to, or nothing. When the app can't be reached the
// answer is nothing: a vendor shouldn't be locked out of their own work because a
// server is down, and the store app blocks anything that actually matters anyway.
export async function agreementOwed(vendorId: string): Promise<OwedAgreement | null> {
  const result = await agreementCall({ vendorId, intent: "owed" });
  return (result?.owed as OwedAgreement | undefined) ?? null;
}

export async function signAgreement(input: {
  vendorId: string;
  vendorUserId: string;
  agreementId: string;
  signedName: string;
  email: string;
  ip: string | null;
}): Promise<{ ok: true } | { errors: Record<string, string> } | { error: string }> {
  const result = await agreementCall({ ...input, intent: "accept" });
  if (!result) return { error: "The store couldn't be reached. Try again in a moment." };
  if (result.ok === true) return { ok: true };
  if (result.errors) return { errors: result.errors as Record<string, string> };
  return { error: (result.error as string) ?? "That couldn't be saved. Try again." };
}
