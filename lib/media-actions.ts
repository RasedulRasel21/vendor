"use server";

import { list } from "@vercel/blob";
import { requireVendorUser } from "@/lib/session";
import { vendorImageFolder, type MediaFile } from "@/lib/uploads";

const PAGE_SIZE = 60;

// A vendor's media library: only files in their own upload folder.
export async function listVendorMedia(
  cursor?: string,
): Promise<{ files: MediaFile[]; cursor: string | null }> {
  const user = await requireVendorUser();
  const folder = vendorImageFolder(user.vendorId);

  const result = await list({ prefix: folder, limit: PAGE_SIZE, cursor });

  return {
    files: result.blobs.map((blob) => ({
      url: blob.url,
      name: blob.pathname.slice(folder.length),
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt).toISOString(),
    })),
    cursor: result.hasMore && result.cursor ? result.cursor : null,
  };
}
