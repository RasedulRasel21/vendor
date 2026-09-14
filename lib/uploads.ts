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
export function vendorImageFolder(vendorId: string) {
  return `vendors/${vendorId}/products/`;
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
