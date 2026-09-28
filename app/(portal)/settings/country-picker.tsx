"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { inputClass, labelClass } from "@/lib/ui";

// Picking from 238 countries by scrolling is miserable, so this is a search box, the ones
// already chosen shown as chips, and a short list of matches to tick.
export function CountryPicker({
  id,
  selected,
  onChange,
}: {
  id: string;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const chosen = useMemo(
    () => COUNTRIES.filter((country) => selected.includes(country.code)),
    [selected],
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(term) || country.code.toLowerCase() === term,
    ).slice(0, 8);
  }, [query]);

  const toggle = (code: string) =>
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Where it applies
      </label>

      {chosen.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {chosen.map((country) => (
            <li key={country.code}>
              <button
                type="button"
                onClick={() => toggle(country.code)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-2 text-sm text-primary-800 hover:bg-primary-100"
              >
                {country.name}
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">Remove {country.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a country"
          autoComplete="off"
          className={`${inputClass} pl-9`}
        />
      </div>

      {matches.length > 0 && (
        <ul className="mt-1.5 overflow-hidden rounded-lg border border-zinc-200">
          {matches.map((country) => {
            const picked = selected.includes(country.code);
            return (
              <li key={country.code}>
                <button
                  type="button"
                  onClick={() => toggle(country.code)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span className={picked ? "font-medium text-primary-800" : "text-zinc-800"}>
                    {country.name}
                  </span>
                  {picked && <Check className="size-4 text-primary-600" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim() && matches.length === 0 && (
        <p className="mt-1.5 text-sm text-zinc-500">Nothing matches “{query.trim()}”.</p>
      )}

      <p className="mt-1.5 text-sm text-zinc-500">
        {chosen.length
          ? `${chosen.length} ${chosen.length === 1 ? "country" : "countries"}. Tap one to take it off.`
          : "None picked, so this rate covers everywhere your other rates don't."}
      </p>
    </div>
  );
}
