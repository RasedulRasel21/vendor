// Next calls this for every error it catches on the server: a page that threw while
// rendering, a server action that blew up, a route handler that failed. Catching them in
// one place means no page has to remember to report its own failures.
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; renderSource?: string },
) {
  const { reportError } = await import("@/lib/report-error");

  await reportError(error, {
    // The route pattern rather than the address: /orders/[id] groups, /orders/abc123
    // would make a new row for every order.
    context: `${request.method} ${context.routePath || request.path}`,
    details: { kind: context.routerKind, source: context.renderSource ?? null },
  });
}
