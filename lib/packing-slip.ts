import QRCode from "qrcode";

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
  unitPrice: string;
  total: string;
};

export type SlipData = {
  id: string;
  orderName: string;
  placedAt: Date;
  vendorName: string;
  shopName: string;
  currencyCode: string;
  customerName: string | null;
  customerEmail: string | null;
  addressLines: string[];
  phone: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  itemsTotal: string;
  shipping: string;
  earnings: string;
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
  subtotal: { toFixed: (digits: number) => string };
  shipping: { toFixed: (digits: number) => string };
  earnings: { toFixed: (digits: number) => string };
  refundedEarnings: { toFixed: (digits: number) => string };
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
  }[];
  VendorShipment: { trackingCompany: string | null; trackingNumber: string | null }[];
};

// Everything one printed slip needs, from a vendor order.
export async function buildSlip(order: OrderForSlip, vendorName: string): Promise<SlipData> {
  const address = (order.shippingAddress ?? null) as Address | null;
  const latestShipment = order.VendorShipment[0] ?? null;

  return {
    id: order.id,
    orderName: order.orderName,
    placedAt: order.placedAt,
    vendorName,
    shopName: shopName(order.shop),
    currencyCode: order.currencyCode,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    addressLines: addressLines(address),
    phone: address?.phone ?? order.customerPhone,
    carrier: latestShipment?.trackingCompany ?? null,
    trackingNumber: latestShipment?.trackingNumber ?? null,
    itemsTotal: order.subtotal.toFixed(2),
    shipping: order.shipping.toFixed(2),
    earnings: (Number(order.earnings.toFixed(2)) - Number(order.refundedEarnings.toFixed(2))).toFixed(2),
    lines: order.VendorOrderLine.map((line) => ({
      id: line.id,
      title: line.title,
      variantTitle: line.variantTitle,
      sku: line.sku,
      imageUrl: line.imageUrl,
      ordered: line.quantity,
      shipped: line.shippedQuantity,
      refunded: line.refundedQuantity,
      toSend: Math.max(0, line.quantity - line.refundedQuantity - line.shippedQuantity),
      unitPrice: line.unitPrice.toFixed(2),
      total: line.subtotal.toFixed(2),
    })),
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
