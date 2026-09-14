import { BadgeCheck, ImagePlus, Wallet } from "lucide-react";

const WHAT_YOU_CAN_DO = [
  { icon: ImagePlus, text: "Add products with photos, variants and prices" },
  { icon: BadgeCheck, text: "See when the store approves them or asks for changes" },
  { icon: Wallet, text: "Get paid to your bank, bKash, Nagad or Rocket" },
];

// Sign-in and invite pages: the brand side explains the portal, the form side does the work.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-primary-600 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-40 size-112 rounded-full border-56 border-primary-300/15"
        />
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-lg bg-white font-display text-xl font-bold text-primary-600"
          >
            S
          </span>
          <span className="font-display text-lg font-semibold">StoreVendor</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-[2.5rem] font-bold leading-[1.12] tracking-tight">
            Sell through the store, without running a website.
          </h2>
          <ul className="mt-8 space-y-4">
            {WHAT_YOU_CAN_DO.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-50">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-primary-200">
                  <Icon className="size-4.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-100">
          Invited by a store? Open the link they sent you to set up your account.
        </p>
      </section>

      <section className="flex items-center justify-center bg-zinc-50 px-4 py-12 sm:px-8">
        <div className="card-surface w-full max-w-md p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-lg bg-primary-600 font-display text-lg font-bold text-white"
            >
              S
            </span>
            <span className="font-display text-lg font-semibold">StoreVendor</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
