// Shared by the upload route, the media server action and the browser uploader.
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type MediaFile = {
  url: string;
  name: string;
  size: number;
  // ISO date; empty for images added by link that aren't in the vendor's library.
  uploadedAt: string;
};

// Each vendor uploads into their own folder; the upload route rejects anything else.
export function vendorFolder(vendorId: string) {
  return `vendors/${vendorId}/`;
}

export function vendorImageFolder(vendorId: string) {
  return `${vendorFolder(vendorId)}products/`;
}

// Kept apart from product images so the media library stays a library of products.
export function vendorProfileFolder(vendorId: string) {
  return `${vendorFolder(vendorId)}profile/`;
}

// An image the vendor uploaded through us, rather than an address they typed. Profile
// images end up on the storefront, so only our own uploads are allowed: otherwise a
// crafted request could point a shop's page at anything on the internet.
const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/.+/i;

export function isUploadedImageUrl(url: string) {
  return BLOB_HOST.test(url);
}

export function imageTypeLabel(name: string) {
  const extension = name.split("?")[0].split(".").pop()?.toUpperCase() ?? "";
  if (extension === "JPEG") return "JPG";
  return ["JPG", "PNG", "WEBP", "GIF"].includes(extension) ? extension : "Image";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
