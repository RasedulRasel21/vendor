import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export type InviteLookup =
  | { status: "invalid" | "expired" | "unavailable" }
  | {
      status: "valid";
      userId: string;
      email: string;
      name: string | null;
      vendorName: string;
    };

export async function findInvite(token: string): Promise<InviteLookup> {
  if (!token || token.length > 200) return { status: "invalid" };

  const user = await db.vendorUser.findUnique({
    where: { inviteTokenHash: hashToken(token) },
    include: { Vendor: true },
  });

  if (!user || user.status !== "INVITED") return { status: "invalid" };
  if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) return { status: "expired" };
  if (user.Vendor.status !== "ACTIVE") return { status: "unavailable" };

  return {
    status: "valid",
    userId: user.id,
    email: user.email,
    name: user.name,
    vendorName: user.Vendor.name,
  };
}
