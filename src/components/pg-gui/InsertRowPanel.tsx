"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InsertRowPanelProps {
  fields: string[];
  onInsert: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export default function InsertRowPanel({
  fields,
  onInsert,
  onClose,
}: InsertRowPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => (init[f] = ""));
    return init;
  });
  const [nullFields, setNullFields] = useState<Set<string>>(
    () => new Set(fields)
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleNull = (field: string) => {
    setNullFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleInsert = async () => {
    setLoading(true);
    setError("");
    try {
      const data: Record<string, unknown> = {};
      fields.forEach((f) => {
        data[f] = nullFields.has(f) ? null : values[f];
      });
      await onInsert(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Insert failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {fields.map((field) => (
          <div key={field} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-slate-600">
                {field}
              </label>
              <button
                onClick={() => toggleNull(field)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  nullFields.has(field)
                    ? "bg-slate-200 text-slate-600"
                    : "bg-transparent text-slate-300 hover:text-slate-500"
                }`}
              >
                NULL
              </button>
            </div>
            <Input
              value={nullFields.has(field) ? "" : values[field]}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [field]: e.target.value }));
                setNullFields((prev) => {
                  const next = new Set(prev);
                  next.delete(field);
                  return next;
                });
              }}
              disabled={nullFields.has(field)}
              placeholder={nullFields.has(field) ? "NULL" : "Enter value..."}
              className="h-8 text-[12px] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        ))}
      </div>
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-xs text-red-600">
          {error}
        </div>
      )}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleInsert}
          disabled={loading}
          className="h-8 text-[12px] bg-[#0f172a] hover:bg-[#1e293b] text-white"
        >
          {loading ? "Inserting..." : "Insert Row"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-8 text-[12px] text-slate-500"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
