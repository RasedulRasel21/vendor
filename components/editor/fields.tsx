"use client";

import { errorClass, inputClass, labelClass } from "@/lib/ui";

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  help,
  prefix,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  prefix?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputClass} ${prefix ? "pl-8" : ""}`}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className={errorClass}>
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="mt-1 text-xs text-zinc-500">
            {help}
          </p>
        )
      )}
    </div>
  );
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  help,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-zinc-800">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-zinc-900"
      />
      <span>
        {label}
        {help && <span className="block text-xs text-zinc-500">{help}</span>}
      </span>
    </label>
  );
}
