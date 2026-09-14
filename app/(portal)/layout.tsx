import Link from "next/link";
import { requireVendorUser } from "@/lib/session";
import { signOut } from "./sign-out";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVendorUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-zinc-500">StoreVendor</p>
              <p className="font-semibold text-zinc-900">{user.Vendor.name}</p>
            </div>
            <nav className="flex gap-5 text-sm font-medium text-zinc-600">
              <Link href="/dashboard" className="hover:text-zinc-900">
                Dashboard
              </Link>
              <Link href="/products" className="hover:text-zinc-900">
                Products
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
