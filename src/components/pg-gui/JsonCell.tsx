"use client";

import { useState, useCallback } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import { Copy, Check, Maximize2 } from "lucide-react";

export function isJsonValue(value: unknown): boolean {
  return value !== null && typeof value === "object";
}

export function isLongString(value: unknown, threshold = 100): boolean {
  return typeof value === "string" && value.length > threshold;
}

export function formatCellPreview(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (!isJsonValue(value)) {
    const s = String(value);
    return s.length > 100 ? s.slice(0, 97) + "..." : s;
  }
  const json = JSON.stringify(value);
  return json.length <= 50 ? json : json.slice(0, 47) + "...";
}

export function getClipboardText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (isJsonValue(value)) return JSON.stringify(value, null, 2);
  return String(value);
}

export default function JsonCell(params: ICellRendererParams) {
  const [copied, setCopied] = useState(false);
  const value = params.value;

  const copyValue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(getClipboardText(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [value]
  );

  const openDetail = useCallback(() => {
    params.context?.onOpenDetail?.(params.colDef?.field || "", value);
  }, [params.context, params.colDef?.field, value]);

  if (value === null || value === undefined) {
    return <span className="text-slate-300 italic text-[11px]">NULL</span>;
  }

  const canExpand = isJsonValue(value) || isLongString(value);
  const preview = formatCellPreview(value);

  return (
    <div className="group/cell flex items-center w-full gap-1">
      <span
        className={`truncate flex-1 ${
          canExpand
            ? "cursor-pointer hover:text-slate-800 font-mono text-[11px] text-slate-500"
            : ""
        }`}
        onClick={canExpand ? openDetail : undefined}
      >
        {preview}
      </span>
      <span className="shrink-0 opacity-0 group-hover/cell:opacity-100 flex items-center gap-0.5 transition-opacity">
        {canExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetail();
            }}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={copyValue}
          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </span>
    </div>
  );
}
