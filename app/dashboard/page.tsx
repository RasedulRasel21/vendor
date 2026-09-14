import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentVendorUser } from "@/lib/session";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Dashboard · StoreVendor",
};

export default async function DashboardPage() {
  const user = await getCurrentVendorUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-zinc-500">StoreVendor vendor portal</p>
          <p className="font-semibold text-zinc-900">{user.Vendor.name}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome, {user.name ?? user.email}
        </h1>
        <p className="mt-2 text-zinc-600">
          Your account is ready. Your products, orders, and earnings will appear here.
        </p>
      </section>
    </main>
  );
}
