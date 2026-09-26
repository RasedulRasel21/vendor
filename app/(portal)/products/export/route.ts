import { db } from "@/lib/db";
import { productsToCsv } from "@/lib/product-csv";
import type { ProductOption } from "@/lib/product-draft";
import { requireVendorUser } from "@/lib/session";

// Everything this vendor has, as a spreadsheet they can edit and send back. Scoped to
// their own products, like everything else in the portal.
export async function GET() {
  const user = await requireVendorUser();

  const submissions = await db.productSubmission.findMany({
    where: { vendorId: user.vendorId },
    orderBy: { updatedAt: "desc" },
    select: {
      title: true,
      handle: true,
      descriptionHtml: true,
      description: true,
      productType: true,
      tags: true,
      seoTitle: true,
      seoDescription: true,
      imageUrls: true,
      options: true,
      variants: true,
    },
  });

  const csv = productsToCsv(
    submissions.map((submission) => ({
      ...submission,
      options: (Array.isArray(submission.options) ? submission.options : []) as ProductOption[],
      variants: (Array.isArray(submission.variants) ? submission.variants : []) as never[],
    })),
  );

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
