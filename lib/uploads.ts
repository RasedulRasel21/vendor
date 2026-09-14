// Shared by the upload route and the browser uploader.
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Each vendor uploads into their own folder; the upload route rejects anything else.
export function vendorImageFolder(vendorId: string) {
  return `vendors/${vendorId}/products/`;
}
