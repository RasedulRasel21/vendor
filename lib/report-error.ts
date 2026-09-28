// Used from the server only: it carries the shared secret, so it must never reach the
// browser.
//
// The portal keeps no error log of its own. Two logs to check is one too many, so what
// breaks here is sent to the store app and lands next to everything else, on the health
// page the merchant already looks at.
//
// Reporting must never be the reason a request fails: everything here swallows its own
// problems and leaves a console line behind.

type Where = {
  // Where it happened: a route, a server action, a background call.
  context: string;
  vendorId?: string;
  // Small, non-personal extras: an order id, an intent, a status code.
  details?: Record<string, unknown>;
};

function bridge() {
  const appUrl = process.env.STORE_APP_URL;
  const secret = process.env.PORTAL_SYNC_SECRET;
  if (!appUrl || !secret) return null;
  return { appUrl: appUrl.replace(/\/$/, ""), secret };
}

function readError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message.slice(0, 1000), stack: error.stack?.slice(0, 6000) ?? null };
  }
  return { message: String(error).slice(0, 1000), stack: null };
}

export async function reportError(error: unknown, where: Where) {
  const { message, stack } = readError(error);
  console.error(`[portal] ${where.context}: ${message}`);

  const config = bridge();
  if (!config) return;

  try {
    const response = await fetch(`${config.appUrl}/api/portal/error`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storevendor-secret": config.secret },
      body: JSON.stringify({ ...where, message, stack }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    // A report that is quietly turned away is worse than none, because the log then looks
    // clean when it isn't.
    if (!response.ok) console.error(`[portal] the store app refused the report above: ${response.status}`);
  } catch (failure) {
    console.error("[portal] couldn't report the error above", failure);
  }
}
