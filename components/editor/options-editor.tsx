"use client";

import { useState } from "react";
import { MAX_OPTIONS, type ProductOption } from "@/lib/product-draft";
import { errorClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const OPTION_SUGGESTIONS = ["Size", "Color", "Material", "Style"];

type Editing = { index: number | "new"; name: string; values: string[] };

// Shopify's options card: each option shows its name and value chips; clicking one opens
// an editor, and changes apply to the variants when the vendor clicks Done.
export function OptionsEditor({
  options,
  errors,
  onChange,
}: {
  options: ProductOption[];
  errors: Record<string, string>;
  onChange: (options: ProductOption[]) => void;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const startEditing = (index: number) =>
    setEditing({ index, name: options[index].name, values: [...options[index].values] });

  const cleanValues = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map((value) => value.trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const finishEditing = () => {
    if (!editing) return;
    const option = { name: editing.name.trim(), values: cleanValues(editing.values) };
    onChange(
      editing.index === "new"
        ? [...options, option]
        : options.map((existing, index) => (index === editing.index ? option : existing)),
    );
    setEditing(null);
  };

  const deleteEditing = () => {
    if (!editing) return;
    if (editing.index !== "new") onChange(options.filter((_, index) => index !== editing.index));
    setEditing(null);
  };

  const moveOption = (from: number, to: number) => {
    if (from === to) return;
    const next = [...options];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const editor = (key: string) => {
    if (!editing) return null;
    const trimmedValues = editing.values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    const duplicateValue = trimmedValues.find((value, index) => trimmedValues.indexOf(value) !== index);
    const nameTaken = options.some(
      (option, index) =>
        index !== editing.index && option.name.trim().toLowerCase() === editing.name.trim().toLowerCase(),
    );
    const canFinish = editing.name.trim() && trimmedValues.length && !duplicateValue && !nameTaken;
    // One blank input at the end, so typing there adds another value.
    const rows = editing.values.at(-1) === "" ? editing.values : [...editing.values, ""];

    return (
      <div key={key} className="space-y-4 p-4">
        <div>
          <label htmlFor="option-name" className={labelClass}>
            Option name
          </label>
          <input
            id="option-name"
            list="option-name-suggestions"
            value={editing.name}
            onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            placeholder="Size"
            className={inputClass}
          />
          {nameTaken && <p className={errorClass}>You&apos;ve already used the option name “{editing.name.trim()}”.</p>}
          <datalist id="option-name-suggestions">
            {OPTION_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div>
          <p className={labelClass}>Option values</p>
          <ul className="space-y-2">
            {rows.map((value, index) => (
              <li key={index} className="flex gap-2">
                <input
                  aria-label={`Option value ${index + 1}`}
                  value={value}
                  onChange={(event) => {
                    const values = [...rows];
                    values[index] = event.target.value;
                    setEditing({ ...editing, values });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  placeholder={index === rows.length - 1 ? "Add another value" : undefined}
                  className={inputClass}
                />
                {index < rows.length - 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${value || "value"}`}
                    onClick={() => setEditing({ ...editing, values: rows.filter((_, i) => i !== index) })}
                    className="shrink-0 rounded-lg px-3 text-zinc-500 hover:bg-zinc-100 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          {duplicateValue && <p className={errorClass}>You&apos;ve already used the value “{duplicateValue}”.</p>}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={deleteEditing} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
            Delete
          </button>
          <button
            type="button"
            onClick={finishEditing}
            disabled={!canFinish}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  if (!options.length && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing({ index: "new", name: "", values: [] })}
        className="text-sm font-semibold text-zinc-900 hover:underline"
      >
        + Add options like size or color
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <ul className="divide-y divide-zinc-200">
        {options.map((option, index) =>
          editing?.index === index ? (
            <li key={index}>{editor(`edit-${index}`)}</li>
          ) : (
            <li
              key={index}
              draggable={!editing}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) moveOption(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={dragIndex === index ? "opacity-50" : ""}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <span aria-hidden className="mt-1 cursor-grab select-none text-zinc-400">
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => startEditing(index)}
                  disabled={Boolean(editing)}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <span className="block text-sm font-semibold text-zinc-900">{option.name || "Untitled option"}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {option.values.map((value) => (
                      <span key={value} className="rounded-md bg-zinc-100 px-2 py-0.5 text-sm text-zinc-800">
                        {value}
                      </span>
                    ))}
                  </span>
                  {(errors[`options.${index}.name`] || errors[`options.${index}.values`]) && (
                    <span className="mt-1 block text-sm text-red-700">
                      {errors[`options.${index}.name`] ?? errors[`options.${index}.values`]}
                    </span>
                  )}
                </button>
              </div>
            </li>
          ),
        )}
        {editing?.index === "new" && <li>{editor("new")}</li>}
      </ul>
      {!editing && options.length < MAX_OPTIONS && (
        <div className="border-t border-zinc-200 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setEditing({ index: "new", name: "", values: [] })}
            className={`${secondaryButtonClass} border-transparent px-2 py-1`}
          >
            ⊕ Add another option
          </button>
        </div>
      )}
      {errors.options && <p className={`${errorClass} px-3 pb-3`}>{errors.options}</p>}
    </div>
  );
}
