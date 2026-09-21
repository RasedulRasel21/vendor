import QRCode from "qrcode";

const slipDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export type SlipLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  imageUrl: string | null;
  ordered: number;
  shipped: number;
  toSend: number;
  refunded: number;
  // Prices include tax, so they match the customer's receipt.
  unitPrice: string;
  total: string;
  requiresShipping: boolean;
  weight: string | null;
};

export type SlipData = {
  id: string;
  orderName: string;
  placedAt: Date;
  // Formatted here on the server: the slip is a client component, and a date formatted in the
  // browser's timezone can land on a different day than the server's, which breaks hydration.
  placedOn: string;
  vendorName: string;
  shopName: string;
  currencyCode: string;
  customerName: string | null;
  customerEmail: string | null;
  addressLines: string[];
  phone: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  // What the customer chose at checkout, like "Standard" or "Express".
  shippingMethod: string | null;
  // What the customer paid for the items in this parcel. The vendor's earnings and the
  // store's commission never appear here: the customer opens this.
  parcelTotal: string;
  parcelWeight: string | null;
  // Digital goods and store pickups aren't posted, so the wording changes.
  nothingToPost: boolean;
  isPickup: boolean;
  lines: SlipLine[];
  qrSvg: string;
};

type Address = {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  zip?: string | null;
  countryCode?: string | null;
  phone?: string | null;
};

type OrderForSlip = {
  id: string;
  orderName: string;
  placedAt: Date;
  shop: string;
  currencyCode: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: unknown;
  deliveryMethod: string | null;
  shippingMethod: string | null;
  VendorOrderLine: {
    id: string;
    title: string;
    variantTitle: string | null;
    sku: string | null;
    imageUrl: string | null;
    quantity: number;
    shippedQuantity: number;
    refundedQuantity: number;
    unitPrice: { toFixed: (digits: number) => string };
    subtotal: { toFixed: (digits: number) => string };
    tax: { toFixed: (digits: number) => string };
    requiresShipping: boolean;
    weight: { toFixed: (digits: number) => string } | null;
    weightUnit: string | null;
  }[];
  VendorShipment: { trackingCompany: string | null; trackingNumber: string | null }[];
};

// Everything one printed slip needs, from a vendor order.
export async function buildSlip(order: OrderForSlip, vendorName: string): Promise<SlipData> {
  const address = (order.shippingAddress ?? null) as Address | null;
  const latestShipment = order.VendorShipment[0] ?? null;

  const lines: SlipLine[] = order.VendorOrderLine.map((line) => {
    const toSend = Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity);
    // Tax is added back, so printed prices match what the customer was charged.
    const paidForLine = Number(line.subtotal.toFixed(2)) + Number(line.tax.toFixed(2));
    const unitPrice = line.quantity > 0 ? paidForLine / line.quantity : 0;
    const weight = line.weight ? Number(line.weight.toFixed(3)) : 0;

    return {
      id: line.id,
      title: line.title,
      variantTitle: line.variantTitle,
      sku: line.sku,
      imageUrl: line.imageUrl,
      ordered: line.quantity,
      shipped: line.shippedQuantity,
      refunded: line.refundedQuantity,
      toSend,
      unitPrice: unitPrice.toFixed(2),
      // Only what's in this parcel, so a part shipment doesn't show the whole order's money.
      total: (unitPrice * toSend).toFixed(2),
      requiresShipping: line.requiresShipping,
      weight: weight > 0 ? `${(weight * toSend).toFixed(3).replace(/\.?0+$/, "")} ${(line.weightUnit ?? "kg").toLowerCase()}` : null,
    };
  });

  const postedLines = lines.filter((line) => line.requiresShipping && line.toSend > 0);
  const parcelWeight = order.VendorOrderLine.reduce((sum, line) => {
    const toSend = Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity);
    const weight = line.weight ? Number(line.weight.toFixed(3)) : 0;
    // Only kilograms and grams are added up; mixed units are left out rather than guessed.
    if (!weight || !["KILOGRAMS", "GRAMS"].includes(line.weightUnit ?? "")) return sum;
    return sum + (line.weightUnit === "GRAMS" ? weight / 1000 : weight) * toSend;
  }, 0);

  return {
    id: order.id,
    orderName: order.orderName,
    placedAt: order.placedAt,
    placedOn: slipDate.format(order.placedAt),
    vendorName,
    shopName: shopName(order.shop),
    currencyCode: order.currencyCode,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    addressLines: addressLines(address),
    phone: address?.phone ?? order.customerPhone,
    carrier: latestShipment?.trackingCompany ?? null,
    trackingNumber: latestShipment?.trackingNumber ?? null,
    shippingMethod: order.shippingMethod,
    parcelTotal: lines.reduce((sum, line) => sum + Number(line.total), 0).toFixed(2),
    parcelWeight: parcelWeight > 0 ? `${parcelWeight.toFixed(3).replace(/\.?0+$/, "")} kg` : null,
    nothingToPost: postedLines.length === 0,
    isPickup: ["PICK_UP", "RETAIL"].includes(order.deliveryMethod ?? ""),
    lines,
    qrSvg: await orderQrSvg(order.orderName),
  };
}

// A square QR of the order number, so a phone or scanner can pull the order up.
export function orderQrSvg(orderName: string) {
  return QRCode.toString(orderName, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#131b2e", light: "#0000" },
  });
}

export function addressLines(address: Address | null) {
  if (!address) return [];
  return [
    address.name,
    address.address1,
    address.address2,
    [address.city, address.provinceCode, address.zip].filter(Boolean).join(" "),
    address.countryCode,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

// The shop's own name, from its myshopify domain, for the "sold through" line.
export function shopName(shop: string) {
  return shop.replace(".myshopify.com", "").replace(/-/g, " ");
}
