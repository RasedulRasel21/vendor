"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { PendingUploads, useImageUploads } from "@/components/editor/use-image-uploads";
import { vendorProfileFolder } from "@/lib/uploads";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { saveProfile, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

type Props = {
  vendorId: string;
  current: {
    logoUrl: string | null;
    bannerUrl: string | null;
    bio: string;
    returnPolicy: string;
    shippingPolicy: string;
  };
};

// One image, shown as it will appear: square for the logo, wide for the banner.
function ImageField({
  label,
  name,
  hint,
  shape,
  value,
  error,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  name: string;
  hint: string;
  shape: "square" | "wide";
  value: string | null;
  error?: string;
  busy: boolean;
  onPick: (files: File[]) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex items-start gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 ${
            shape === "square" ? "size-24" : "h-24 w-44"
          }`}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="176px" className="object-cover" unoptimized />
          ) : (
            <span className="flex size-full items-center justify-center text-zinc-400">
              <ImagePlus className="size-6" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{hint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className={secondaryButtonClass}
            >
              {value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button type="button" onClick={onClear} className={`${secondaryButtonClass} text-red-700`}>
                <Trash2 className="size-4" aria-hidden />
                Remove
              </button>
            )}
          </div>
          {error && <p className={errorClass}>{error}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onPick(files.slice(0, 1));
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function ProfileForm({ vendorId, current }: Props) {
  const [state, formAction, saving] = useActionState(saveProfile, initialState);
  const { pending, uploading, uploadFiles, dismiss } = useImageUploads(vendorId, vendorProfileFolder);
  const [logoUrl, setLogoUrl] = useState(current.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(current.bannerUrl);

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <ImageField
          label="Logo"
          name="logoUrl"
          hint="Square works best. Shown next to your shop name."
          shape="square"
          value={logoUrl}
          error={errors.logoUrl}
          busy={uploading}
          onPick={(files) => uploadFiles(files, (file) => setLogoUrl(file.url))}
          onClear={() => setLogoUrl(null)}
        />
        <ImageField
          label="Banner"
          name="bannerUrl"
          hint="A wide picture across the top of your page."
          shape="wide"
          value={bannerUrl}
          error={errors.bannerUrl}
          busy={uploading}
          onPick={(files) => uploadFiles(files, (file) => setBannerUrl(file.url))}
          onClear={() => setBannerUrl(null)}
        />
      </div>

      <PendingUploads pending={pending} onDismiss={dismiss} />

      <div>
        <label htmlFor="bio" className={labelClass}>
          About your shop
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={1000}
          defaultValue={current.bio}
          placeholder="Who you are, what you make, and anything a customer might like to know."
          className={inputClass}
        />
        {errors.bio && <p className={errorClass}>{errors.bio}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="shippingPolicy" className={labelClass}>
            How you ship
          </label>
          <textarea
            id="shippingPolicy"
            name="shippingPolicy"
            rows={4}
            maxLength={2000}
            defaultValue={current.shippingPolicy}
            placeholder="How long you take to post an order, and where you send to."
            className={inputClass}
          />
          {errors.shippingPolicy && <p className={errorClass}>{errors.shippingPolicy}</p>}
        </div>
        <div>
          <label htmlFor="returnPolicy" className={labelClass}>
            Returns
          </label>
          <textarea
            id="returnPolicy"
            name="returnPolicy"
            rows={4}
            maxLength={2000}
            defaultValue={current.returnPolicy}
            placeholder="Whether you take returns, for how long, and who pays the postage."
            className={inputClass}
          />
          {errors.returnPolicy && <p className={errorClass}>{errors.returnPolicy}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || uploading} className={primaryButtonClass}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {state.ok && !saving && <span className="text-sm text-primary-700">Saved</span>}
      </div>
    </form>
  );
}
