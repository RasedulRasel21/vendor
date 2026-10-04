"use client";

import { useActionState } from "react";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { saveShopName } from "./actions";
import type { SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

// The name customers see on every product this seller sells. Theirs to change, like the
// rest of their shop front — the store only has to approve where the money goes.
export function ShopNameForm({ current }: { current: string }) {
  const [state, formAction, saving] = useActionState(saveShopName, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.ok && !saving && (
        <p className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
          {state.warning ?? "Saved. Your products show the new name."}
        </p>
      )}

      <div>
        <label htmlFor="shop-name" className={labelClass}>
          Shop name
        </label>
        <input
          id="shop-name"
          name="name"
          defaultValue={current}
          maxLength={100}
          required
          className={inputClass}
        />
        {state.errors?.name ? (
          <p className={errorClass}>{state.errors.name}</p>
        ) : (
          <p className="mt-1.5 text-sm text-zinc-500">
            Shown on the store as &ldquo;Sold by&rdquo; on everything you sell.
          </p>
        )}
      </div>

      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
