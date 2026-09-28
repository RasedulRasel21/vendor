// Emails the portal needs sent.
//
// The portal writes its own rows — a product sent for approval, a payout detail change, a
// problem with an order — but it has no email account of its own, and shouldn't: one
// sender, one log, one set of words. So it says what happened and the store app writes and
// sends the message.
//
// Every call is best-effort. Nobody's product submission should fail because an email
// didn't go out.

type Notification =
  | { intent: "product-submitted"; vendorId: string; submissionId: string; edit?: boolean }
  | { intent: "products-changed"; vendorId: string; count: number }
  | { intent: "change-requested"; vendorId: string; changeId: string }
  | { intent: "order-issue"; vendorId: string; vendorOrderId: string; reason: string; note?: string | null }
  | { intent: "team-invite"; vendorId: string; email: string; url: string; invitedBy?: string | null }
  | { intent: "password-reset"; email: string; url: string };

export async function notifyByEmail(notification: Notification) {
  const appUrl = process.env.STORE_APP_URL;
  const secret = process.env.PORTAL_SYNC_SECRET;
  if (!appUrl || !secret) {
    console.error("STORE_APP_URL or PORTAL_SYNC_SECRET is missing, so no email was sent");
    return { skipped: true };
  }

  try {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/portal/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": secret },
      body: JSON.stringify(notification),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`Email request (${notification.intent}) answered ${response.status}`);
      return { error: true };
    }
    return { ok: true };
  } catch (error) {
    const { reportError } = await import("@/lib/report-error");
    await reportError(error, { context: `notify:${notification.intent}` });
    return { error: true };
  }
}
