"use client";

import { useActionState, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import {
  cancelInvite,
  inviteTeammate,
  resendInvite,
  setTeammateAccess,
  type TeamState,
} from "./team-actions";

const initialState: TeamState = {};

export type Teammate = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  inviteExpired: boolean;
};

const STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-primary-50 text-primary-700" },
  INVITED: { label: "Invited", className: "bg-amber-50 text-amber-800" },
  DISABLED: { label: "Switched off", className: "bg-zinc-100 text-zinc-600" },
};

// The link is only worth anything once, so it's shown once, with a button to copy it.
function InviteLink({ origin, path, email }: { origin: string; path: string; email: string }) {
  const [copied, setCopied] = useState(false);
  // The whole address, built on the server from the host they're using, so what's shown
  // is the same before and after the page comes alive in the browser.
  const url = `${origin}${path}`;

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
      <p className="text-sm font-semibold text-primary-900">Send this link to {email}</p>
      <p className="mt-1 text-sm text-primary-800">
        It works once and runs out in 7 days. They set their own password.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-2 text-xs text-zinc-700">
          {url}
        </code>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function TeamCard({
  team,
  currentUserId,
  origin,
}: {
  team: Teammate[];
  currentUserId: string;
  origin: string;
}) {
  const [state, formAction, inviting] = useActionState(inviteTeammate, initialState);
  const [resent, setResent] = useState<TeamState | null>(null);

  const link = resent?.invitePath ? resent : state.invitePath ? state : null;

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-zinc-200">
        {team.map((member) => {
          const status = STATUS[member.status] ?? STATUS.ACTIVE;
          const isYou = member.id === currentUserId;

          return (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">
                  {member.name || member.email}
                  {isYou && <span className="ml-2 text-sm font-normal text-zinc-500">you</span>}
                </p>
                <p className="truncate text-sm text-zinc-500">
                  {member.name ? `${member.email} · ` : ""}
                  {member.role === "OWNER" ? "Owner" : "Staff"}
                  {member.lastLoginAt ? ` · last signed in ${member.lastLoginAt}` : ""}
                  {member.status === "INVITED" && member.inviteExpired ? " · invite ran out" : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>

                {member.role === "STAFF" && member.status === "INVITED" && (
                  <>
                    <form
                      action={async () => {
                        setResent(await resendInvite(member.id));
                      }}
                    >
                      <button type="submit" className={secondaryButtonClass}>
                        New link
                      </button>
                    </form>
                    <form action={cancelInvite.bind(null, member.id)}>
                      <button type="submit" className={`${secondaryButtonClass} text-red-700`}>
                        Cancel
                      </button>
                    </form>
                  </>
                )}

                {member.role === "STAFF" && member.status !== "INVITED" && (
                  <form action={setTeammateAccess.bind(null, member.id, member.status === "DISABLED")}>
                    <button type="submit" className={secondaryButtonClass}>
                      {member.status === "DISABLED" ? "Switch back on" : "Switch off"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {link?.invitePath && (
        <InviteLink origin={origin} path={link.invitePath} email={link.invitedEmail ?? "them"} />
      )}
      {resent?.error && <p className={errorClass}>{resent.error}</p>}

      <form action={formAction} className="space-y-4 border-t border-zinc-200 pt-5">
        {state.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {state.error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="teamEmail" className={labelClass}>
              Their email
            </label>
            <input id="teamEmail" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="teamName" className={labelClass}>
              Their name (optional)
            </label>
            <input id="teamName" name="name" type="text" maxLength={80} className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={inviting} className={primaryButtonClass}>
          <UserPlus className="size-4" aria-hidden />
          {inviting ? "Inviting…" : "Invite"}
        </button>
        <p className="text-sm text-zinc-500">
          Staff can add products and handle orders. Payout and tax details stay with you.
        </p>
      </form>
    </div>
  );
}
