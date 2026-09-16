"use client";

import { useEffect, useRef } from "react";
import type { CustomCellEditorProps } from "ag-grid-react";

export const NULL_OPTION = "__null__";

/** Map a select option back to the value stored in the row. */
export function parseBooleanOption(option: string): boolean | null {
  if (option === "true") return true;
  if (option === "false") return false;
  return null;
}

/** Map any cell value (boolean, pg text form, or null) to a select option. */
export function toBooleanOption(value: unknown): string {
  if (value === true || value === "true" || value === "t") return "true";
  if (value === false || value === "false" || value === "f") return "false";
  return NULL_OPTION;
}

/**
 * Cell editor for boolean columns. AG Grid's default text editor turns
 * `true` into the string "true" (or fails on an empty string), so booleans
 * get an explicit true / false / NULL picker that commits on change.
 */
export default function BooleanCellEditor({
  value,
  onValueChange,
  stopEditing,
}: CustomCellEditorProps) {
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <select
      ref={ref}
      aria-label="Boolean value"
      value={toBooleanOption(value)}
      onChange={(e) => {
        onValueChange(parseBooleanOption(e.target.value));
        stopEditing();
      }}
      className="w-full h-full px-2 text-[13px] bg-white text-slate-700 outline-none cursor-pointer"
    >
      <option value="true">true</option>
      <option value="false">false</option>
      <option value={NULL_OPTION}>NULL</option>
    </select>
  );
}
