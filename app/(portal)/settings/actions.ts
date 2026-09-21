"use server";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { COUNTRY_CODES } from "@/lib/countries";
import { db } from "@/lib/db";
import { validatePayout } from "@/lib/payout";
import { requireVendorUser } from "@/lib/session";
import { saveTaxDetails } from "@/lib/store-app";

export type SettingsFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Tax details save straight away, like contact details, but only the owner can change them:
// they end up on invoices and tax filings. The store app encrypts the tax ID.
export async function saveTax(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireVendorUser();
  if (user.role !== "OWNER") return { errors: { form: "Only the account owner can change tax details." } };

  const names = [
    "entityType", "legalName", "countryCode", "taxId", "dateOfBirth", "line1", "line2", "city", "postalCode",
  ];
  const fields = Object.fromEntries(names.map((name) => [name, field(formData, name)]));

  const result = await saveTaxDetails(user.vendorId, `vendor_user:${user.id}`, fields);
  if ("errors" in result) return { errors: result.errors };
  if ("error" in result) return { errors: { form: result.error } };

  revalidatePath("/settings");
  return { ok: true };
}

// Contact details don't need approval, so they save straight away.
export async function updateContact(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireVendorUser();

  const values = {
    phone: field(formData, "phone"),
    addressLine1: field(formData, "addressLine1"),
    addressLine2: field(formData, "addressLine2"),
    city: field(formData, "city"),
    postalCode: field(formData, "postalCode"),
    countryCode: field(formData, "countryCode").toUpperCase(),
  };

  const errors: Record<string, string> = {};
  if (values.phone && !/^\+?[\d\s()-]{6,20}$/.test(values.phone)) {
    errors.phone = "Enter a phone number like 01712345678";
  }
  if (values.addressLine1.length > 200) errors.addressLine1 = "Use 200 characters or fewer";
  if (values.addressLine2.length > 200) errors.addressLine2 = "Use 200 characters or fewer";
  if (values.city.length > 100) errors.city = "Use 100 characters or fewer";
  if (values.postalCode.length > 20) errors.postalCode = "Use 20 characters or fewer";
  if (values.countryCode && !COUNTRY_CODES.includes(values.countryCode)) {
    errors.countryCode = "Choose a country from the list";
  }
  if (Object.keys(errors).length) return { errors };

  const now = new Date();
  await db.$transaction([
    db.vendor.update({
      where: { id: user.vendorId },
      data: {
        phone: values.phone || null,
        addressLine1: values.addressLine1 || null,
        addressLine2: values.addressLine2 || null,
        city: values.city || null,
        postalCode: values.postalCode || null,
        countryCode: values.countryCode || null,
        updatedAt: now,
      },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "vendor.contact_updated",
        actor: `vendor_user:${user.id}`,
      },
    }),
  ]);

  revalidatePath("/settings");
  return { ok: true };
}

// Payout details only change when the store approves. A new request replaces a pending one.
export async function requestPayoutChange(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireVendorUser();
  if (user.role !== "OWNER") {
    return { errors: { form: "Only the account owner can change payout details." } };
  }

  const result = validatePayout({
    method: field(formData, "method"),
    accountName: field(formData, "accountName"),
    accountNumber: field(formData, "accountNumber"),
    bankName: field(formData, "bankName"),
    branchName: field(formData, "branchName"),
    routingNumber: field(formData, "routingNumber"),
  });
  if ("errors" in result) return { errors: result.errors };

  const vendor = user.Vendor;
  const requestId = randomUUID();
  const now = new Date();

  await db.$transaction([
    db.vendorChangeRequest.updateMany({
      where: { vendorId: vendor.id, type: "PAYOUT", status: "PENDING" },
      data: { status: "CANCELLED", updatedAt: now },
    }),
    db.vendorChangeRequest.create({
      data: {
        id: requestId,
        shop: vendor.shop,
        vendorId: vendor.id,
        type: "PAYOUT",
        status: "PENDING",
        requested: result.data as unknown as Prisma.InputJsonValue,
        ...(vendor.payoutMethod
          ? {
              previous: {
                method: vendor.payoutMethod,
                details: vendor.payoutDetails,
              } as unknown as Prisma.InputJsonValue,
            }
          : {}),
        requestedById: user.id,
        updatedAt: now,
      },
    }),
    db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: vendor.id,
        action: "vendor.payout_change_requested",
        actor: `vendor_user:${user.id}`,
        details: { requestId, method: result.data.method },
      },
    }),
  ]);

  revalidatePath("/settings");
  return { ok: true };
}

export async function cancelPayoutRequest() {
  const user = await requireVendorUser();
  if (user.role !== "OWNER") return;

  const now = new Date();
  const cancelled = await db.vendorChangeRequest.updateMany({
    where: { vendorId: user.vendorId, type: "PAYOUT", status: "PENDING" },
    data: { status: "CANCELLED", updatedAt: now },
  });

  if (cancelled.count) {
    await db.vendorActivity.create({
      data: {
        id: randomUUID(),
        vendorId: user.vendorId,
        action: "vendor.payout_change_cancelled",
        actor: `vendor_user:${user.id}`,
      },
    });
  }

  revalidatePath("/settings");
}
