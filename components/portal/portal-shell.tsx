"use client";

import { House, LogOut, Menu, Package, Plus, Settings, Truck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(portal)/sign-out";

const NAV = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function BrandMark({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-display text-base font-bold text-white"
    >
      {name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}

export function PortalShell({
  storeName,
  userName,
  userEmail,
  productsNeedingChanges,
  newOrders,
  children,
}: {
  storeName: string;
  userName: string;
  userEmail: string;
  productsNeedingChanges: number;
  newOrders: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/90 px-4 shadow-[0_1px_8px_rgb(19_27_46/0.06)] backdrop-blur print:hidden lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark name={storeName} />
          <span className="truncate font-display font-semibold">{storeName}</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="portal-sidebar"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {menuOpen && (
        <div aria-hidden className="fixed inset-0 z-40 bg-zinc-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        id="portal-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-[1px_0_8px_rgb(19_27_46/0.05)] transition-transform duration-200 print:hidden lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark name={storeName} />
            <div className="min-w-0">
              <p className="truncate font-display font-semibold leading-tight text-zinc-900">{storeName}</p>
              <p className="text-xs text-zinc-500">Vendor portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 pt-2">
          <Link
            href="/products/new"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Add product
          </Link>
        </div>

        <nav aria-label="Main" className="mt-5 flex-1 space-y-1 px-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            const count = href === "/products" ? productsNeedingChanges : href === "/orders" ? newOrders : 0;
            const badge = count > 0 ? count : null;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-primary-500 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="flex-1">{label}</span>
                {badge !== null && (
                  <span
                    title={
                      href === "/orders"
                        ? `${badge} new ${badge === 1 ? "order" : "orders"}`
                        : `${badge} ${badge === 1 ? "product needs" : "products need"} changes`
                    }
                    className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                      active ? "bg-white text-primary-700" : "bg-secondary-600 text-white"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="bg-zinc-50 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white p-2.5 shadow-[0_1px_8px_rgb(19_27_46/0.05)]">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
            >
              {userName.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{userName}</p>
              <p className="truncate text-xs text-zinc-500">{userEmail}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-16 pt-6 print:p-0 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
