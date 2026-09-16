"use client";

import { useActionState, useState } from "react";
import type { CarrierOptions } from "@/lib/carriers";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { markShipped, requestCarrier, type CarrierRequestState, type ShipFormState } from "./actions";

const initialState: ShipFormState = {};
const initialRequestState: CarrierRequestState = {};

export type ShippableLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  remaining: number;
};

export function ShipForm({
  vendorOrderId,
  lines,
  carriers,
}: {
  vendorOrderId: string;
  lines: ShippableLine[];
  carriers: CarrierOptions;
}) {
  const [state, formAction, pending] = useActionState(markShipped.bind(null, vendorOrderId), initialState);
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [link, setLink] = useState("");
  const [linkTouched, setLinkTouched] = useState(false);
  const errors = state.errors ?? {};
  const severalItems = lines.length > 1 || lines.some((line) => line.remaining > 1);

  // Couriers the store added itself can carry a link pattern, so the vendor only types the number.
  const template = carriers.approved.find((carrier) => carrier.name === company)?.trackingUrlTemplate;
  const suggestedLink =
    template && trackingNumber ? template.replace("{tracking_number}", encodeURIComponent(trackingNumber)) : "";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primaryButtonClass}>
        Mark as shipped
      </button>
    );
  }

  return (
    <>
      <form action={formAction} className="space-y-5">
        {errors.form && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {errors.form}
          </p>
        )}

        {severalItems && (
          <fieldset>
            <legend className={labelClass}>What&apos;s in this parcel?</legend>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{line.title}</p>
                    <p className="text-xs text-zinc-500">
                      {[line.variantTitle, `${line.remaining} left to send`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <label htmlFor={`qty-${line.id}`} className="sr-only">
                    {`Quantity of ${line.title} in this parcel`}
                  </label>
                  <input
                    id={`qty-${line.id}`}
                    name={`qty:${line.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={line.remaining}
                    defaultValue={line.remaining}
                    className={`${inputClass} w-20 text-center`}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-sm text-zinc-500">
              Send part of the order now and the rest later; each parcel gets its own tracking.
            </p>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="trackingCompany" className={labelClass}>
              Courier
            </label>
            <select
              id="trackingCompany"
              name="trackingCompany"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              aria-invalid={Boolean(errors.trackingCompany)}
              className={inputClass}
            >
              <option value="">No courier</option>
              {carriers.approved.length > 0 && (
                <optgroup label="Added by the store">
                  {carriers.approved.map((carrier) => (
                    <option key={carrier.name} value={carrier.name}>
                      {carrier.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Tracked by Shopify">
                {carriers.fromShopify.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </optgroup>
            </select>
            {errors.trackingCompany && <p className={errorClass}>{errors.trackingCompany}</p>}
          </div>
          <div>
            <label htmlFor="trackingNumber" className={labelClass}>
              Tracking number
            </label>
            <input
              id="trackingNumber"
              name="trackingNumber"
              placeholder="Optional"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              aria-invalid={Boolean(errors.trackingNumber)}
              className={inputClass}
            />
            {errors.trackingNumber && <p className={errorClass}>{errors.trackingNumber}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="trackingUrl" className={labelClass}>
            Tracking link
          </label>
          <input
            id="trackingUrl"
            name="trackingUrl"
            placeholder="https://"
            inputMode="url"
            value={linkTouched ? link : suggestedLink}
            onChange={(event) => {
              setLinkTouched(true);
              setLink(event.target.value);
            }}
            aria-invalid={Boolean(errors.trackingUrl)}
            className={inputClass}
          />
          {errors.trackingUrl ? (
            <p className={errorClass}>{errors.trackingUrl}</p>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-500">
              Leave it empty for couriers Shopify tracks; it builds the link from the number. The customer is
              emailed as soon as you mark it shipped.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Marking shipped…" : "Mark as shipped"}
          </button>
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>

      <CarrierRequest request={carriers.request} />
    </>
  );
}

function CarrierRequest({ request }: { request: CarrierOptions["request"] }) {
  const [state, formAction, pending] = useActionState(requestCarrier, initialRequestState);
  const [open, setOpen] = useState(false);
  const errors = state.errors ?? {};

  if (state.ok) {
    return (
      <p className="mt-5 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-700">
        Sent. The store will let you know once they add it, and it shows up in this list.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
        {request?.status === "PENDING" ? (
          <p>{`You asked the store to add ${request.name}. You can use it once they say yes.`}</p>
        ) : request?.status === "REJECTED" ? (
          <p>
            {`The store turned down ${request.name}${request.reviewNote ? `: ${request.reviewNote}` : "."}`}{" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-semibold text-primary-700 underline-offset-4 hover:underline"
            >
              Ask for another courier
            </button>
          </p>
        ) : (
          <p>
            Courier not on the list?{" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-semibold text-primary-700 underline-offset-4 hover:underline"
            >
              Ask the store to add it
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
      <p className="text-sm text-zinc-500">
        The store checks every courier before vendors can use it, so tracking links keep working for customers.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="carrierName" className={labelClass}>
            Courier name
          </label>
          <input id="carrierName" name="name" placeholder="Pathao" className={inputClass} required />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="carrierUrl" className={labelClass}>
            Tracking link
          </label>
          <input
            id="carrierUrl"
            name="trackingUrlTemplate"
            placeholder="https://courier.com/track?id={tracking_number}"
            inputMode="url"
            className={inputClass}
          />
          {errors.trackingUrlTemplate ? (
            <p className={errorClass}>{errors.trackingUrlTemplate}</p>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-500">
              Optional. Put <code>{"{tracking_number}"}</code> where the number goes.
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="carrierReason" className={labelClass}>
          Why you need it
        </label>
        <textarea
          id="carrierReason"
          name="reason"
          rows={2}
          placeholder="They're the only courier that covers my area."
          className={inputClass}
          required
        />
        {errors.reason && <p className={errorClass}>{errors.reason}</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
