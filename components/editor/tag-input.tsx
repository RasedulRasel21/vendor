"use client";

import { useState } from "react";

export function TagInput({
  id,
  values,
  onChange,
  placeholder,
  max = 250,
  invalid,
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  invalid?: boolean;
}) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const next = [...values];
    for (const part of raw.split(",").map((value) => value.trim()).filter(Boolean)) {
      if (!next.some((value) => value.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next.slice(0, max));
    setText("");
  };

  return (
    <div
      className={`flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-sm focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 ${
        invalid ? "border-red-500" : "border-zinc-300"
      }`}
    >
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 pl-2 pr-1 text-sm text-zinc-800"
        >
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded px-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            if (text.trim()) add(text);
          } else if (event.key === "Backspace" && !text && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => text.trim() && add(text)}
        placeholder={values.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
      />
    </div>
  );
}
