import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/tokens";

// Forgotten passwords. Same scheme as the invite: a random token, only its hash kept, and
// a short life. What the portal says back never changes, whether or not the address is
// one we know, because "no account with that email" tells anyone who asks who sells here.

const RESET_MINUTES = 60;

/**
 * Starts a reset and returns the link to email, or null when there is nobody to send it
 * to. The caller says the same thing either way.
 */
export async function startPasswordReset(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email) return null;

  // One address can belong to accounts at more than one store; the one they last used is
  // the one they mean.
  const user = await db.vendorUser.findFirst({
    where: { email, status: "ACTIVE", passwordHash: { not: null } },
    orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
    select: { id: true },
  });
  if (!user) return null;

  const token = createToken();
  await db.vendorUser.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(token),
      resetExpiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  return `${origin.replace(/\/$/, "")}/reset/${token}`;
}

export type ResetLookup =
  | { status: "invalid" | "expired" }
  | { status: "valid"; userId: string; email: string };

export async function findReset(token: string): Promise<ResetLookup> {
  if (!token || token.length > 200) return { status: "invalid" };

  const user = await db.vendorUser.findUnique({
    where: { resetTokenHash: hashToken(token) },
    select: { id: true, email: true, status: true, resetExpiresAt: true, Vendor: { select: { status: true } } },
  });

  if (!user || user.status !== "ACTIVE" || user.Vendor.status !== "ACTIVE") return { status: "invalid" };
  if (!user.resetExpiresAt || user.resetExpiresAt < new Date()) return { status: "expired" };

  return { status: "valid", userId: user.id, email: user.email };
}
