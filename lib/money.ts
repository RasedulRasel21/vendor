export function formatMoney(amount: string | number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(Number(amount));
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

// The short currency symbol for a shop currency, for example "৳" for BDT or "$" for USD.
export function currencySymbol(currencyCode: string) {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currencyCode
    );
  } catch {
    return currencyCode;
  }
}
