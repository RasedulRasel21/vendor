import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentVendorUser } from "@/lib/session";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, vendorFolder } from "@/lib/uploads";

const TOKEN_MINUTES = 10;

// Issues short-lived tokens so signed-in vendors upload images straight from the
// browser to Vercel Blob, without sending the file through this server.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentVendorUser();
        if (!user) throw new Error("Sign in to upload images");
        // Their own folder, whichever part of it: products, or their shop's profile.
        if (!pathname.startsWith(vendorFolder(user.vendorId))) {
          throw new Error("Images can only be uploaded to your own folder");
        }

        return {
          allowedContentTypes: IMAGE_CONTENT_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + TOKEN_MINUTES * 60 * 1000,
          tokenPayload: JSON.stringify({ vendorUserId: user.id }),
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
