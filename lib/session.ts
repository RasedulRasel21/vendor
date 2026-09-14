import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/tokens";

const SESSION_COOKIE = "sv_session";
const SESSION_DAYS = 30;

// Call from a Server Function: cookies can't be set while rendering.
export async function startSession(vendorUserId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.vendorSession.create({
    data: { id: randomUUID(), tokenHash: hashToken(token), vendorUserId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// The signed-in vendor user, or null. Disabled users and inactive vendors count as signed out.
export async function getCurrentVendorUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.vendorSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { VendorUser: { include: { Vendor: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const user = session.VendorUser;
  if (user.status !== "ACTIVE" || user.Vendor.status !== "ACTIVE") return null;

  return user;
}

// For pages and Server Functions that need a signed-in vendor; sends everyone else to login.
export async function requireVendorUser() {
  const user = await getCurrentVendorUser();
  if (!user) redirect("/login");
  return user;
}

// Call from a Server Function.
export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.vendorSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
