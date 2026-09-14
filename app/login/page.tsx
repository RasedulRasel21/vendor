import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentVendorUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · StoreVendor",
};

export default async function LoginPage() {
  if (await getCurrentVendorUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-zinc-500">StoreVendor vendor portal</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage your products, orders, and earnings. New vendor? Open the invite link the
          store sent you to set up your account.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
