"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { ICellRendererParams } from "ag-grid-community";

function isJsonValue(value: unknown): boolean {
  return value !== null && typeof value === "object";
}

function formatPreview(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (!isJsonValue(value)) return String(value);
  const json = JSON.stringify(value);
  if (json.length <= 50) return json;
  return json.slice(0, 47) + "...";
}

function JsonModal({
  field,
  json,
  onClose,
}: {
  field: string;
  json: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-[640px] max-h-[80vh] w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="text-[13px] font-medium text-slate-700">{field}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(json)}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50"
            >
              Copy
            </button>
            <button
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[12px] font-mono text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50">
          {json}
        </pre>
      </div>
    </div>,
    document.body
  );
}

export default function JsonCell(params: ICellRendererParams) {
  const [open, setOpen] = useState(false);
  const value = params.value;

  if (value === null || value === undefined) {
    return <span className="text-slate-300 italic text-[11px]">NULL</span>;
  }

  if (!isJsonValue(value)) {
    return <span>{String(value)}</span>;
  }

  const preview = formatPreview(value);
  const fullJson = JSON.stringify(value, null, 2);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left font-mono text-[11px] text-slate-500 hover:text-slate-800 truncate block w-full cursor-pointer"
      >
        {preview}
      </button>
      {open && (
        <JsonModal
          field={params.colDef?.field || "JSON"}
          json={fullJson}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
