// Payout details a vendor can request. The merchant approves every change.

export const PAYOUT_METHODS = [
  { value: "BANK", label: "Bank account" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]["value"];

export type PayoutDetails = {
  accountName: string;
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
};

export type PayoutInput = {
  method: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  routingNumber: string;
};

function isPayoutMethod(value: unknown): value is PayoutMethod {
  return PAYOUT_METHODS.some((method) => method.value === value);
}

export function payoutMethodLabel(method: unknown) {
  return PAYOUT_METHODS.find((item) => item.value === method)?.label ?? "";
}

// Label/value rows for showing payout details; account numbers are masked unless asked.
export function payoutRows(method: unknown, details: unknown, { mask = true } = {}) {
  if (!isPayoutMethod(method) || !details || typeof details !== "object") return [];

  const values = details as Partial<PayoutDetails>;
  const number = values.accountNumber ?? "";
  const rows = [
    { label: "Method", value: payoutMethodLabel(method) },
    { label: "Account name", value: values.accountName ?? "" },
    {
      label: method === "BANK" ? "Account number" : "Mobile number",
      value: mask && number.length > 4 ? `•••• ${number.slice(-4)}` : number,
    },
  ];

  if (method === "BANK") {
    rows.push(
      { label: "Bank", value: values.bankName ?? "" },
      { label: "Branch", value: values.branchName ?? "" },
    );
    if (values.routingNumber) rows.push({ label: "Routing number", value: values.routingNumber });
  }

  return rows;
}

// Bangladeshi mobile wallet numbers: 01XXXXXXXXX, with an optional +88 or 88 prefix.
function normalizeMobile(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  if (digits.startsWith("+88")) return digits.slice(3);
  if (digits.startsWith("88") && digits.length === 13) return digits.slice(2);
  return digits;
}

export function validatePayout(
  input: PayoutInput,
): { errors: Record<string, string> } | { data: { method: PayoutMethod; details: PayoutDetails } } {
  const errors: Record<string, string> = {};
  const method = input.method;
  const accountName = input.accountName.trim();

  if (!isPayoutMethod(method)) {
    return { errors: { method: "Choose how you want to be paid" } };
  }

  if (accountName.length < 2) errors.accountName = "Enter the name on the account";
  else if (accountName.length > 100) errors.accountName = "Use 100 characters or fewer";

  if (method === "BANK") {
    const accountNumber = input.accountNumber.replace(/[\s-]/g, "");
    const bankName = input.bankName.trim();
    const branchName = input.branchName.trim();
    const routingNumber = input.routingNumber.replace(/\s/g, "");

    if (!/^\d{8,20}$/.test(accountNumber)) errors.accountNumber = "Enter the account number (8 to 20 digits)";
    if (!bankName) errors.bankName = "Enter the bank name";
    else if (bankName.length > 100) errors.bankName = "Use 100 characters or fewer";
    if (!branchName) errors.branchName = "Enter the branch name";
    else if (branchName.length > 100) errors.branchName = "Use 100 characters or fewer";
    if (routingNumber && !/^\d{9}$/.test(routingNumber)) errors.routingNumber = "Routing numbers have 9 digits";

    if (Object.keys(errors).length) return { errors };
    return {
      data: {
        method,
        details: { accountName, accountNumber, bankName, branchName, ...(routingNumber ? { routingNumber } : {}) },
      },
    };
  }

  const accountNumber = normalizeMobile(input.accountNumber);
  if (!/^01[3-9]\d{8}$/.test(accountNumber)) {
    errors.accountNumber = "Enter the 11-digit wallet number, like 01712345678";
  }

  if (Object.keys(errors).length) return { errors };
  return { data: { method, details: { accountName, accountNumber } } };
}
