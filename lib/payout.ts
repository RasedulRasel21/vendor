// Payout details a vendor can request. The merchant approves every change.

export const PAYOUT_METHODS = [
  { value: "BANK", label: "Bank account" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "UPI", label: "UPI" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "PAYONEER", label: "Payoneer" },
  { value: "WISE", label: "Wise" },
  { value: "OTHER", label: "Other" },
] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]["value"];

// Every method keeps its main identifier in accountNumber; only what it's called differs.
export const ACCOUNT_FIELD: Record<PayoutMethod, { label: string; help?: string; inputMode: "text" | "tel" | "email" }> = {
  BANK: { label: "Account number or IBAN", inputMode: "text" },
  BKASH: { label: "Wallet number", help: "The 11-digit number registered with the wallet.", inputMode: "tel" },
  NAGAD: { label: "Wallet number", help: "The 11-digit number registered with the wallet.", inputMode: "tel" },
  ROCKET: { label: "Wallet number", help: "The 11-digit number registered with the wallet.", inputMode: "tel" },
  UPI: { label: "UPI ID", help: "Like name@okhdfcbank.", inputMode: "email" },
  MPESA: { label: "M-Pesa number", help: "With the country code, like +254712345678.", inputMode: "tel" },
  PAYPAL: { label: "PayPal email", inputMode: "email" },
  PAYONEER: { label: "Payoneer email", inputMode: "email" },
  WISE: { label: "Wise email", inputMode: "email" },
  OTHER: { label: "How to pay you", help: "What the store needs to send you money.", inputMode: "text" },
};

export type PayoutDetails = {
  accountName: string;
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  // The currency the vendor wants to receive, when it's not the store's.
  currency?: string;
};

export type PayoutInput = {
  method: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  routingNumber: string;
  currency?: string;
};

// Currencies a vendor can ask to be paid in, named in English.
export function currencyOptions() {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "currency" });
    return Intl.supportedValuesOf("currency")
      .map((code) => ({ code, name: `${names.of(code) ?? code} (${code})` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return ["USD", "EUR", "GBP", "INR", "BDT", "AED", "CAD", "AUD"].map((code) => ({ code, name: code }));
  }
}

function isPayoutMethod(value: unknown): value is PayoutMethod {
  return PAYOUT_METHODS.some((method) => method.value === value);
}

// Stripe isn't typed into the form: the account comes from Stripe's own onboarding. It
// still needs a label wherever payout details are shown.
export function payoutMethodLabel(method: unknown) {
  if (method === "STRIPE") return "Stripe";
  return PAYOUT_METHODS.find((item) => item.value === method)?.label ?? "";
}

function mask(value: string) {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}•••@${domain}`;
  }
  return value.length > 4 ? `•••• ${value.slice(-4)}` : value;
}

// Label/value rows for showing payout details; account numbers are masked unless asked.
export function payoutRows(method: unknown, details: unknown, { mask: hide = true } = {}) {
  if (!details || typeof details !== "object") return [];
  if (method === "STRIPE") {
    const account = (details as Partial<PayoutDetails>).accountNumber ?? "";
    return [
      { label: "Method", value: "Stripe" },
      { label: "Stripe account", value: hide ? mask(account) : account },
    ];
  }
  if (!isPayoutMethod(method)) return [];

  const values = details as Partial<PayoutDetails>;
  const number = values.accountNumber ?? "";
  const rows = [
    { label: "Method", value: payoutMethodLabel(method) },
    { label: "Account name", value: values.accountName ?? "" },
    { label: ACCOUNT_FIELD[method].label, value: hide ? mask(number) : number },
  ];

  if (method === "BANK") {
    rows.push({ label: "Bank", value: values.bankName ?? "" });
    if (values.branchName) rows.push({ label: "Branch", value: values.branchName });
    if (values.routingNumber) rows.push({ label: "Routing or SWIFT code", value: values.routingNumber });
  }
  if (values.currency) rows.push({ label: "Paid in", value: values.currency });

  return rows;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Bangladeshi mobile wallet numbers: 01XXXXXXXXX, with an optional +88 or 88 prefix.
function normalizeBangladeshMobile(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  if (digits.startsWith("+88")) return digits.slice(3);
  if (digits.startsWith("88") && digits.length === 13) return digits.slice(2);
  return digits;
}

// Each method is checked in its own format, so a typo is caught here rather than when a
// transfer bounces. Everything else about the account is the merchant's to verify.
function checkAccount(method: PayoutMethod, raw: string): { value: string } | { error: string } {
  const value = raw.trim();
  switch (method) {
    case "BANK": {
      const compact = value.replace(/[\s-]/g, "").toUpperCase();
      return /^[A-Z0-9]{6,34}$/.test(compact)
        ? { value: compact }
        : { error: "Enter the account number or IBAN (6 to 34 letters and digits)" };
    }
    case "BKASH":
    case "NAGAD":
    case "ROCKET": {
      const number = normalizeBangladeshMobile(value);
      return /^01[3-9]\d{8}$/.test(number)
        ? { value: number }
        : { error: "Enter the 11-digit wallet number, like 01712345678" };
    }
    case "MPESA": {
      const number = value.replace(/[\s-]/g, "");
      return /^\+?\d{9,15}$/.test(number)
        ? { value: number }
        : { error: "Enter the number with its country code, like +254712345678" };
    }
    case "UPI":
      return /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(value)
        ? { value: value.toLowerCase() }
        : { error: "Enter a UPI ID, like name@okhdfcbank" };
    case "PAYPAL":
    case "PAYONEER":
    case "WISE":
      return EMAIL.test(value) && value.length <= 254
        ? { value: value.toLowerCase() }
        : { error: "Enter the email on the account" };
    case "OTHER":
      return value.length >= 3 && value.length <= 200
        ? { value }
        : { error: "Tell the store how to pay you (3 to 200 characters)" };
  }
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

  const account = checkAccount(method, input.accountNumber);
  if ("error" in account) errors.accountNumber = account.error;

  // Blank means the store's own currency.
  const currency = (input.currency ?? "").trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) errors.currency = "Choose a currency from the list";
  const extra = currency ? { currency } : {};

  if (method === "BANK") {
    const bankName = input.bankName.trim();
    const branchName = input.branchName.trim();
    // A US routing number, a SWIFT/BIC, an Indian IFSC or a UK sort code all fit here.
    const routingNumber = input.routingNumber.replace(/[\s-]/g, "").toUpperCase();

    if (!bankName) errors.bankName = "Enter the bank name";
    else if (bankName.length > 100) errors.bankName = "Use 100 characters or fewer";
    if (branchName.length > 100) errors.branchName = "Use 100 characters or fewer";
    if (routingNumber && !/^[A-Z0-9]{6,11}$/.test(routingNumber)) {
      errors.routingNumber = "Enter the routing number, SWIFT, IFSC or sort code";
    }

    if (Object.keys(errors).length || "error" in account) return { errors };
    return {
      data: {
        method,
        details: {
          accountName,
          accountNumber: account.value,
          bankName,
          ...(branchName ? { branchName } : {}),
          ...(routingNumber ? { routingNumber } : {}),
          ...extra,
        },
      },
    };
  }

  if (Object.keys(errors).length || "error" in account) return { errors };
  return { data: { method, details: { accountName, accountNumber: account.value, ...extra } } };
}
