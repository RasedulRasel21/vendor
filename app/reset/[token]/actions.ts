"use server";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { findReset } from "@/lib/password-reset";
import { startSession } from "@/lib/session";
import { hashToken } from "@/lib/tokens";

export type ResetState = {
  errors?: { password?: string; confirmPassword?: string; form?: string };
};

const MIN_PASSWORD_LENGTH = 10;

export async function setNewPassword(
  token: string,
  _previousState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const reset = await findReset(token);
  if (reset.status !== "valid") {
    return { errors: { form: "This link is no longer valid. Ask for another one." } };
  }

  const errors: NonNullable<ResetState["errors"]> = {};
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Use at least one letter and one number";
  } else if (password.toLowerCase() === reset.email.toLowerCase()) {
    errors.password = "Don't use your email address as your password";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords don't match";
  }
  if (Object.keys(errors).length) return { errors };

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const done = await db.$transaction(async (tx) => {
    // Only while this exact link is unused, so it works once.
    const updated = await tx.vendorUser.updateMany({
      where: { id: reset.userId, resetTokenHash: hashToken(token) },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetExpiresAt: null,
        // A new password clears a lockout: someone locked out by guesses is usually the
        // person who forgot it.
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      },
    });
    if (updated.count !== 1) return false;

    // Signing in everywhere else ends, in case the reason for the reset was somebody else
    // being in there.
    await tx.vendorSession.deleteMany({ where: { vendorUserId: reset.userId } });

    const user = await tx.vendorUser.findUniqueOrThrow({
      where: { id: reset.userId },
      select: { vendorId: true },
    });
    await tx.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "vendor_user.password_reset",
        actor: `vendor_user:${reset.userId}`,
        details: { email: reset.email },
      },
    });

    return true;
  });

  if (!done) return { errors: { form: "This link has already been used. Ask for another one." } };

  await startSession(reset.userId);
  redirect("/dashboard");
}
