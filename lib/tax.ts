// Kept in step with app/models/tax.server.js in the StoreVendor app, which validates and
// stores what's sent from here.

export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export type TaxInfo = {
  entityType?: "INDIVIDUAL" | "BUSINESS";
  legalName?: string;
  countryCode?: string;
  taxIdType?: string;
  taxIdLast4?: string;
  dateOfBirth?: string;
  address?: { line1?: string; line2?: string; city?: string; postalCode?: string; countryCode?: string };
};

// What a tax ID is called where the vendor is, so the form asks for the right thing.
export function taxIdName(countryCode: string, entityType: string) {
  if (countryCode === "US") return entityType === "BUSINESS" ? "EIN" : "SSN or ITIN";
  if (countryCode === "BD") return entityType === "BUSINESS" ? "BIN" : "TIN";
  if (countryCode === "IN") return entityType === "BUSINESS" ? "GSTIN" : "PAN";
  if (countryCode === "GB") return entityType === "BUSINESS" ? "VAT number" : "UTR or NI number";
  if (EU_COUNTRIES.has(countryCode)) return entityType === "BUSINESS" ? "VAT number" : "Tax ID (TIN)";
  return "Tax ID";
}
