import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Card } from "@/components/editor/card";
import { PageHeader } from "@/components/portal/page-header";
import { requireVendorUser } from "@/lib/session";
import { signedAgreements } from "@/lib/store-app";
import { storeName } from "@/lib/store-name";

export const metadata: Metadata = {
  title: "Seller agreement · StoreVendor",
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// Reading back what you agreed to. The signing page promises this, and a contract you can
// only read once isn't much of a contract: the text here is the version actually signed,
// not whatever the store has published since.
export default async function AgreementPage() {
  const user = await requireVendorUser();
  const [signed, store] = await Promise.all([
    signedAgreements(user.vendorId),
    storeName(user.Vendor.shop),
  ]);

  const [latest, ...older] = signed;

  return (
    <div>
      <PageHeader
        title="Seller agreement"
        description={`What you agreed with ${store}, kept exactly as you signed it.`}
        back={{ href: "/settings", label: "Settings" }}
      />

      {!latest ? (
        <Card title="Nothing signed yet">
          <p className="text-sm text-zinc-600">
            {store} hasn&apos;t asked you to agree to anything. If they publish terms later,
            you&apos;ll be asked to read and sign them before you carry on selling, and the copy
            you signed will be kept here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card
            title={latest.title}
            description={
              latest.current
                ? `Signed by ${latest.signedName} on ${dateFormat.format(new Date(latest.acceptedAt))}. These are the terms in force.`
                : `Signed by ${latest.signedName} on ${dateFormat.format(new Date(latest.acceptedAt))}. ${store} has since published a newer version.`
            }
            actions={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                <FileText className="size-3.5" aria-hidden />
                Version {latest.version}
              </span>
            }
          >
            <article className="whitespace-pre-line text-sm leading-6 text-zinc-800">
              {latest.body}
            </article>
            <p className="mt-5 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
              Signed as <span className="font-medium text-zinc-700">{latest.signedName}</span> (
              {latest.signedEmail}) on {dateFormat.format(new Date(latest.acceptedAt))}.
            </p>
          </Card>

          {older.length > 0 && (
            <Card
              title="Earlier versions"
              description="Kept so you can see what you were selling under at the time."
            >
              <ul className="space-y-3">
                {older.map((agreement) => (
                  <li key={agreement.id}>
                    <details className="rounded-lg border border-zinc-200">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
                        {`Version ${agreement.version} — ${agreement.title}`}
                        <span className="ml-2 font-normal text-zinc-500">
                          signed {dateFormat.format(new Date(agreement.acceptedAt))}
                        </span>
                      </summary>
                      <div className="border-t border-zinc-200 px-4 py-3">
                        <article className="whitespace-pre-line text-sm leading-6 text-zinc-700">
                          {agreement.body}
                        </article>
                        <p className="mt-4 text-sm text-zinc-500">
                          Signed as {agreement.signedName} ({agreement.signedEmail}).
                        </p>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
