"use client";

import { Table2, Terminal, X } from "lucide-react";
import TableView from "./TableView";
import QueryEditor from "./QueryEditor";
import { Connection } from "@/lib/api";

export interface SortConfig {
  column: string;
  direction: "ASC" | "DESC";
}

export interface FilterConfig {
  column: string;
  operator: string;
  value: string;
}

export interface WindowItem {
  id: number;
  type: "table" | "query";
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  schema?: string;
  table?: string;
  initialQuery?: string;
  savedQueryId?: number;
  sort?: SortConfig | null;
  filters?: FilterConfig[];
  limit?: number;
}

interface WindowManagerProps {
  windows: WindowItem[];
  activeConnection: Connection | null;
  onClose: (id: number) => void;
  onFocus: (id: number) => void;
  readOnly: boolean;
  noSchemaChanges: boolean;
  activeTabId: number | null;
  onSelectTab: (id: number) => void;
  onTabStateChange: (id: number, state: { sort?: SortConfig | null; filters?: FilterConfig[]; limit?: number }) => void;
  onOpenQuery: (sql: string) => void;
}

export default function WindowManager({
  windows,
  activeConnection,
  onClose,
  onFocus,
  readOnly,
  noSchemaChanges,
  activeTabId,
  onSelectTab,
  onTabStateChange,
  onOpenQuery,
}: WindowManagerProps) {
  if (windows.length === 0) return null;

  const activeTab = windows.find((w) => w.id === activeTabId) || windows[0];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-end bg-white border-b border-slate-200/70 overflow-x-auto shrink-0">
        {windows.map((win) => {
          const isActive = win.id === activeTab.id;
          return (
            <button
              key={win.id}
              className={`flex items-center gap-1.5 px-3.5 h-[38px] text-[12px] shrink-0 transition-colors group relative ${
                isActive
                  ? "text-slate-800 font-medium"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => { onSelectTab(win.id); onFocus(win.id); }}
            >
              {win.type === "table" ? (
                <Table2 className="h-3 w-3 shrink-0" />
              ) : (
                <Terminal className="h-3 w-3 shrink-0" />
              )}
              <span className="max-w-[120px] truncate">{win.title}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-all ml-0.5"
              >
                <X className="h-3 w-3" />
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content — all tabs stay mounted, only active is visible */}
      <div className="flex-1 overflow-hidden relative">
        {windows.map((win) => (
          <div
            key={win.id}
            style={{ display: win.id === activeTab.id ? "block" : "none" }}
            className="absolute inset-0"
          >
            {win.type === "table" && activeConnection && win.schema && win.table && (
              <TableView
                connection={activeConnection}
                schema={win.schema}
                table={win.table}
                readOnly={readOnly}
                initialSort={win.sort}
                initialFilters={win.filters}
                initialLimit={win.limit}
                onStateChange={(state) => onTabStateChange(win.id, state)}
                onOpenQuery={onOpenQuery}
              />
            )}
            {win.type === "query" && activeConnection && (
              <QueryEditor connection={activeConnection} initialQuery={win.initialQuery} savedQueryId={win.savedQueryId} readOnly={readOnly} noSchemaChanges={noSchemaChanges} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
