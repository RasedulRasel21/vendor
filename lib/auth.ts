import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type CredentialCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "locked" | "inactive" };

// Compared when no account matches, so response time doesn't reveal whether an email exists.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hash("storevendor-no-account", 12);
  return dummyHash;
}

// One email can belong to vendor accounts at more than one store; the most recently used wins.
export async function verifyCredentials(emailInput: string, password: string): Promise<CredentialCheck> {
  const email = emailInput.trim().toLowerCase();
  const now = new Date();

  const users = await db.vendorUser.findMany({
    where: { email, passwordHash: { not: null } },
    include: { Vendor: true },
    orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
  });

  const unlocked = users.filter((user) => !user.lockedUntil || user.lockedUntil <= now);

  if (!unlocked.length) {
    await bcrypt.compare(password, await getDummyHash());
    return { ok: false, reason: users.length ? "locked" : "invalid" };
  }

  for (const user of unlocked) {
    if (!(await bcrypt.compare(password, user.passwordHash!))) continue;

    if (user.status !== "ACTIVE" || user.Vendor.status !== "ACTIVE") {
      return { ok: false, reason: "inactive" };
    }

    await db.vendorUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now, updatedAt: now },
    });
    return { ok: true, userId: user.id };
  }

  await Promise.all(
    unlocked.map((user) => {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      return db.vendorUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: locked ? 0 : attempts,
          lockedUntil: locked ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
          updatedAt: now,
        },
      });
    }),
  );

  return { ok: false, reason: "invalid" };
}
