"use server";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { findInvite } from "@/lib/invite";
import { startSession } from "@/lib/session";
import { hashToken } from "@/lib/tokens";

export type AcceptInviteState = {
  errors?: {
    name?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  };
};

const MIN_PASSWORD_LENGTH = 10;

export async function acceptInvite(
  token: string,
  _previousState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const invite = await findInvite(token);
  if (invite.status !== "valid") {
    return { errors: { form: "This invite link is no longer valid. Ask the store for a new one." } };
  }

  const errors: NonNullable<AcceptInviteState["errors"]> = {};

  if (!name) errors.name = "Enter your name";
  else if (name.length > 100) errors.name = "Use 100 characters or fewer";

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Use at least one letter and one number";
  } else if (password.toLowerCase() === invite.email.toLowerCase()) {
    errors.password = "Don't use your email address as your password";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords don't match";
  }

  if (Object.keys(errors).length) return { errors };

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  // The update only matches while this exact invite is unused, so each link works once.
  const accepted = await db.$transaction(async (tx) => {
    const updated = await tx.vendorUser.updateMany({
      where: { id: invite.userId, status: "INVITED", inviteTokenHash: hashToken(token) },
      data: {
        name,
        passwordHash,
        status: "ACTIVE",
        inviteTokenHash: null,
        inviteExpiresAt: null,
        lastLoginAt: now,
        updatedAt: now,
      },
    });
    if (updated.count !== 1) return false;

    const user = await tx.vendorUser.findUniqueOrThrow({
      where: { id: invite.userId },
      select: { vendorId: true },
    });
    await tx.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "vendor_user.invite_accepted",
        actor: `vendor_user:${invite.userId}`,
        details: { email: invite.email },
      },
    });

    return true;
  });

  if (!accepted) {
    return { errors: { form: "This invite link has already been used." } };
  }

  await startSession(invite.userId);
  redirect("/dashboard");
}
