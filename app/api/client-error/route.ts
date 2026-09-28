import { getCurrentVendorUser } from "@/lib/session";
import { reportError } from "@/lib/report-error";

// A page that breaks in the browser leaves nothing on the server, so the error page sends
// what it knows here. Only a signed-in vendor can report, and which vendor is read from
// their session rather than taken from the request, so nobody can file under someone else.
export async function POST(request: Request) {
  const user = await getCurrentVendorUser();
  if (!user) return Response.json({ ok: true });

  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    digest?: unknown;
    path?: unknown;
  } | null;

  const message = typeof body?.message === "string" ? body.message.slice(0, 500) : "";
  if (!message) return Response.json({ ok: true });

  const path = typeof body?.path === "string" ? body.path.slice(0, 200) : "";

  await reportError(message, {
    context: `browser ${path || "portal"}`,
    vendorId: user.vendorId,
    details: { digest: typeof body?.digest === "string" ? body.digest : null },
  });

  return Response.json({ ok: true });
}
