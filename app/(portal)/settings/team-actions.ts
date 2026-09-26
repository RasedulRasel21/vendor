"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireVendorUser } from "@/lib/session";
import { createToken, hashToken } from "@/lib/tokens";

// Letting a vendor bring in the people who actually pack the orders. Everything here is
// the owner's to do: staff can use the portal but can't change who else can.

const INVITE_DAYS = 7;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type TeamState = {
  error?: string;
  // The link to send them, shown once. Email would do this for us, when we can send it.
  invitePath?: string;
  invitedEmail?: string;
};

async function requireOwner() {
  const user = await requireVendorUser();
  if (user.role !== "OWNER") return null;
  return user;
}

export async function inviteTeammate(_previousState: TeamState, formData: FormData): Promise<TeamState> {
  const owner = await requireOwner();
  if (!owner) return { error: "Only the account owner can invite people." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!email) return { error: "Enter their email address." };
  if (!EMAIL.test(email)) return { error: "That doesn't look like an email address." };

  const existing = await db.vendorUser.findUnique({
    where: { vendorId_email: { vendorId: owner.vendorId, email } },
    select: { status: true },
  });
  if (existing) {
    return {
      error:
        existing.status === "INVITED"
          ? "They've already been invited. Send them the link again from the list below."
          : "They already have access to this account.",
    };
  }

  const invite = createToken();
  await db.vendorUser.create({
    data: {
      id: randomUUID(),
      vendorId: owner.vendorId,
      email,
      name: name || null,
      role: "STAFF",
      status: "INVITED",
      inviteTokenHash: hashToken(invite),
      inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings");
  return { invitePath: `/invite/${invite}`, invitedEmail: email };
}

// A fresh link, which cancels the old one: the token is replaced, not added to.
export async function resendInvite(userId: string): Promise<TeamState> {
  const owner = await requireOwner();
  if (!owner) return { error: "Only the account owner can do that." };

  const member = await db.vendorUser.findFirst({
    where: { id: userId, vendorId: owner.vendorId, status: "INVITED" },
    select: { id: true, email: true },
  });
  if (!member) return { error: "That invite isn't there any more." };

  const invite = createToken();
  await db.vendorUser.update({
    where: { id: member.id },
    data: {
      inviteTokenHash: hashToken(invite),
      inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings");
  return { invitePath: `/invite/${invite}`, invitedEmail: member.email };
}

export async function cancelInvite(userId: string) {
  const owner = await requireOwner();
  if (!owner) return;

  // Only an invite that was never accepted: deleting someone who has been working would
  // take their history with them.
  await db.vendorUser.deleteMany({
    where: { id: userId, vendorId: owner.vendorId, status: "INVITED", role: "STAFF" },
  });

  revalidatePath("/settings");
}

export async function setTeammateAccess(userId: string, enabled: boolean) {
  const owner = await requireOwner();
  if (!owner) return;
  // The owner can't lock themselves out, and one owner can't switch off another.
  if (userId === owner.id) return;

  const member = await db.vendorUser.findFirst({
    where: { id: userId, vendorId: owner.vendorId, role: "STAFF" },
    select: { id: true },
  });
  if (!member) return;

  await db.vendorUser.update({
    where: { id: member.id },
    data: { status: enabled ? "ACTIVE" : "DISABLED", updatedAt: new Date() },
  });

  // Signing out is already the effect of being disabled, but their sessions shouldn't sit
  // in the table waiting to be useful again if they're ever re-enabled.
  if (!enabled) await db.vendorSession.deleteMany({ where: { vendorUserId: member.id } });

  revalidatePath("/settings");
}
