import { db } from "@/lib/db";

// The door an outside monitor knocks on, and the one the store app knocks on when it runs
// its own check. Open, because a monitor can't carry a secret, so it answers "up" or
// "down" and nothing else.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  try {
    // The cheapest question that still proves a connection, a session and a query.
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { ok: true, ms: Date.now() - started, time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, ms: Date.now() - started, time: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
