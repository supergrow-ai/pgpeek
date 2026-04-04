"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
} from "ag-grid-community";
import { Button } from "@/components/ui/button";
import JsonCell, { isJsonValue, getClipboardText } from "./JsonCell";
import SidePanel from "./SidePanel";
import InsertRowPanel from "./InsertRowPanel";
import { api, Connection } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Key,
  ArrowUpDown,
  Filter,
  X,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
} from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withPart(colorSchemeLight).withParams({
  backgroundColor: "#fff",
  headerBackgroundColor: "#f8fafc",
  oddRowBackgroundColor: "#fcfcfd",
  rowHoverColor: "rgba(15, 23, 42, 0.02)",
  borderColor: "#e2e8f0",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 500,
  cellHorizontalPadding: 14,
  headerTextColor: "#64748b",
  foregroundColor: "#1e293b",
  accentColor: "#0f172a",
  borderRadius: 0,
  wrapperBorderRadius: 0,
});

interface FilterItem {
  id: number;
  column: string;
  operator: string;
  value: string;
}

interface SortConfig {
  column: string;
  direction: "ASC" | "DESC";
}

const OPERATORS = [
  { value: "=", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: ">", label: "greater than" },
  { value: "<", label: "less than" },
  { value: ">=", label: "greater or equal" },
  { value: "<=", label: "less or equal" },
  { value: "LIKE", label: "like" },
  { value: "ILIKE", label: "ilike" },
  { value: "IS NULL", label: "is null" },
  { value: "IS NOT NULL", label: "is not null" },
];

const NO_VALUE_OPS = ["IS NULL", "IS NOT NULL"];

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];

interface ExternalFilter {
  column: string;
  operator: string;
  value: string;
}

interface TableViewProps {
  connection: Connection;
  schema: string;
  table: string;
  readOnly: boolean;
  initialSort?: SortConfig | null;
  initialFilters?: ExternalFilter[];
  initialLimit?: number;
  onStateChange?: (state: {
    sort?: SortConfig | null;
    filters?: ExternalFilter[];
    limit?: number;
  }) => void;
}

export default function TableView({
  connection,
  schema,
  table,
  readOnly,
  initialSort,
  initialFilters,
  initialLimit,
  onStateChange,
}: TableViewProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(initialLimit ?? 100);
  const [pkColumns, setPkColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const gridRef = useRef<AgGridReact>(null);

  // Side panel state
  const [detailPanel, setDetailPanel] = useState<{
    field: string;
    value: unknown;
  } | null>(null);
  const [showInsertPanel, setShowInsertPanel] = useState(false);

  // Draft state (user edits these)
  const [draftSort, setDraftSort] = useState<SortConfig | null>(
    initialSort ?? null
  );
  const [draftFilters, setDraftFilters] = useState<FilterItem[]>(
    (initialFilters ?? []).map((f, i) => ({ ...f, id: i + 1 }))
  );
  const [filterCounter, setFilterCounter] = useState(
    initialFilters?.length ?? 0
  );
  const [showFilters, setShowFilters] = useState(
    (initialFilters ?? []).length > 0
  );

  // Applied state (sent to API)
  const [appliedSort, setAppliedSort] = useState<SortConfig | null>(
    initialSort ?? null
  );
  const [appliedFilters, setAppliedFilters] = useState<FilterItem[]>(
    (initialFilters ?? []).map((f, i) => ({ ...f, id: i + 1 }))
  );

  // Track if draft differs from applied
  const isDirty =
    JSON.stringify(draftSort) !== JSON.stringify(appliedSort) ||
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const applyFilters = useCallback(() => {
    setAppliedSort(draftSort);
    setAppliedFilters([...draftFilters]);
    setOffset(0);
    onStateChange?.({
      sort: draftSort,
      filters: draftFilters.map(({ column, operator, value }) => ({
        column,
        operator,
        value,
      })),
      limit,
    });
  }, [draftSort, draftFilters, onStateChange, limit]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const activeFilters = appliedFilters
        .filter(
          (f) =>
            f.column &&
            f.operator &&
            (NO_VALUE_OPS.includes(f.operator) || f.value)
        )
        .map(({ column, operator, value }) => ({ column, operator, value }));

      const [data, pks] = await Promise.all([
        api.getTableData(
          connection.id,
          schema,
          table,
          limit,
          offset,
          appliedSort,
          activeFilters
        ),
        api.getPrimaryKeys(connection.id, schema, table),
      ]);
      setRows(data.rows);
      setFields(data.fields);
      setTotal(data.total);
      setPkColumns(pks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [connection.id, schema, table, offset, limit, appliedSort, appliedFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent) => {
      if (pkColumns.length === 0) {
        setError("Cannot edit: no primary key detected");
        loadData();
        return;
      }
      try {
        const pkValues = pkColumns.map((col) => event.data[col]);
        await api.updateCell(connection.id, schema, table, {
          pkColumns,
          pkValues,
          column: event.colDef.field!,
          value: event.newValue,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Update failed");
        loadData();
      }
    },
    [connection.id, schema, table, pkColumns, loadData]
  );

  const handleInsertRow = useCallback(
    async (data: Record<string, unknown>) => {
      await api.insertRow(connection.id, schema, table, data);
      setShowInsertPanel(false);
      loadData();
    },
    [connection.id, schema, table, loadData]
  );

  const handleDeleteRow = useCallback(async () => {
    const selectedRows = gridRef.current?.api.getSelectedRows();
    if (!selectedRows?.length || pkColumns.length === 0) return;
    try {
      for (const row of selectedRows) {
        const pkValues = pkColumns.map((col) => row[col]);
        await api.deleteRow(connection.id, schema, table, {
          pkColumns,
          pkValues,
        });
      }
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }, [connection.id, schema, table, pkColumns, loadData]);

  // Filter helpers
  const addFilter = () => {
    const id = filterCounter + 1;
    setFilterCounter(id);
    setDraftFilters((prev) => [
      ...prev,
      { id, column: fields[0] || "", operator: "=", value: "" },
    ]);
    setShowFilters(true);
  };

  const updateFilter = (id: number, patch: Partial<FilterItem>) => {
    setDraftFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const removeFilter = (id: number) => {
    setDraftFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiltersAndSort = () => {
    setDraftFilters([]);
    setDraftSort(null);
    setAppliedFilters([]);
    setAppliedSort(null);
    setShowFilters(false);
    setOffset(0);
    onStateChange?.({ sort: null, filters: [], limit });
  };

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
    onStateChange?.({
      sort: appliedSort,
      filters: appliedFilters.map(({ column, operator, value }) => ({
        column,
        operator,
        value,
      })),
      limit: newLimit,
    });
  };

  // AG Grid context — passes callbacks to cell renderers
  const gridContext = useMemo(
    () => ({
      onOpenDetail: (field: string, value: unknown) => {
        setDetailPanel({ field, value });
      },
    }),
    []
  );

  const columnDefs: ColDef[] = useMemo(
    () =>
      fields.map((field) => ({
        field,
        editable: !readOnly && pkColumns.length > 0,
        sortable: false,
        filter: false,
        resizable: true,
        minWidth: 120,
        headerName: field,
        cellClass: pkColumns.includes(field) ? "text-[#0f172a]" : "",
        cellRenderer: JsonCell,
      })),
    [fields, pkColumns, readOnly]
  );

  const pageCount = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const activeFilterCount = draftFilters.filter(
    (f) =>
      f.column &&
      f.operator &&
      (NO_VALUE_OPS.includes(f.operator) || f.value)
  ).length;

  // Format the detail value for display
  const detailDisplayValue = detailPanel
    ? isJsonValue(detailPanel.value)
      ? JSON.stringify(detailPanel.value, null, 2)
      : String(detailPanel.value ?? "")
    : "";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e8f0] shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[12px] text-slate-500 hover:text-slate-700"
          onClick={loadData}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        {!readOnly && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[12px] text-slate-500 hover:text-slate-700"
              onClick={() => setShowInsertPanel(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Row
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[12px] text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={handleDeleteRow}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </>
        )}

        <div className="h-4 w-px bg-[#e2e8f0] mx-1" />

        {/* Sort button */}
        <Button
          size="sm"
          variant={draftSort ? "default" : "ghost"}
          className={`h-7 text-[12px] ${
            draftSort
              ? "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] border border-[#cbd5e1]"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => {
            if (draftSort) {
              setDraftSort(null);
            } else if (fields.length > 0) {
              setDraftSort({ column: fields[0], direction: "ASC" });
            }
          }}
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          {draftSort
            ? `${draftSort.column} ${draftSort.direction}`
            : "Sort"}
        </Button>

        {/* Filter button */}
        <Button
          size="sm"
          variant={activeFilterCount > 0 ? "default" : "ghost"}
          className={`h-7 text-[12px] ${
            activeFilterCount > 0
              ? "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] border border-[#cbd5e1]"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => {
            if (draftFilters.length === 0) addFilter();
            else setShowFilters(!showFilters);
          }}
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1.5 bg-[#0f172a] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Apply button */}
        {isDirty && (
          <Button
            size="sm"
            onClick={applyFilters}
            className="h-7 text-[12px] bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-sm"
          >
            Apply
          </Button>
        )}

        {/* Clear all */}
        {(draftSort || draftFilters.length > 0) && (
          <button
            onClick={clearAllFiltersAndSort}
            className="text-[12px] text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex items-center gap-4 text-[12px] text-slate-400">
          {pkColumns.length > 0 && (
            <span className="flex items-center gap-1 text-[#0f172a]/60">
              <Key className="h-3.5 w-3.5" />
              {pkColumns.join(", ")}
            </span>
          )}
          <span className="tabular-nums">
            {total.toLocaleString()} rows
          </span>
        </div>
      </div>

      {/* Sort row */}
      {draftSort && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#e2e8f0] bg-[#fafbfd] shrink-0">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mr-1">
            Sort by
          </span>
          <select
            value={draftSort.column}
            onChange={(e) =>
              setDraftSort({ ...draftSort, column: e.target.value })
            }
            className="h-7 px-2 text-[12px] rounded-md border border-[#e2e8f0] bg-white text-slate-600 outline-none focus:border-[#0f172a]"
          >
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              setDraftSort({
                ...draftSort,
                direction:
                  draftSort.direction === "ASC" ? "DESC" : "ASC",
              })
            }
            className="h-7 px-2 rounded-md border border-[#e2e8f0] bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 flex items-center gap-1 text-[12px] transition-colors cursor-pointer"
          >
            {draftSort.direction === "ASC" ? (
              <>
                <ArrowUp className="h-3 w-3" /> Ascending
              </>
            ) : (
              <>
                <ArrowDown className="h-3 w-3" /> Descending
              </>
            )}
          </button>
          <button
            onClick={() => setDraftSort(null)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Filter rows */}
      {showFilters && draftFilters.length > 0 && (
        <div className="border-b border-[#e2e8f0] bg-[#fafbfd] shrink-0">
          {draftFilters.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-2 px-4 py-1.5">
              {idx === 0 ? (
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide w-12">
                  Where
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide w-12">
                  And
                </span>
              )}
              <select
                value={f.column}
                onChange={(e) =>
                  updateFilter(f.id, { column: e.target.value })
                }
                className="h-7 px-2 text-[12px] rounded-md border border-[#e2e8f0] bg-white text-slate-600 outline-none focus:border-[#0f172a] min-w-[120px]"
              >
                {fields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <select
                value={f.operator}
                onChange={(e) =>
                  updateFilter(f.id, { operator: e.target.value })
                }
                className="h-7 px-2 text-[12px] rounded-md border border-[#e2e8f0] bg-white text-slate-600 outline-none focus:border-[#0f172a]"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {!NO_VALUE_OPS.includes(f.operator) && (
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) =>
                    updateFilter(f.id, { value: e.target.value })
                  }
                  placeholder="value"
                  className="h-7 px-2 text-[12px] rounded-md border border-[#e2e8f0] bg-white text-slate-600 outline-none focus:border-[#0f172a] placeholder:text-slate-300 w-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters();
                  }}
                />
              )}
              <button
                onClick={() => removeFilter(f.id)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-1.5">
            <span className="w-12" />
            <button
              onClick={addFilter}
              className="text-[12px] text-[#0f172a] hover:text-[#1e293b] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add filter
            </button>
            {draftFilters.length > 0 && (
              <button
                onClick={() => {
                  setDraftFilters([]);
                }}
                className="text-[12px] text-slate-400 hover:text-slate-600 ml-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Grid + Side panels */}
      <div className="flex-1 overflow-hidden relative">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          onCellValueChanged={onCellValueChanged}
          rowSelection="multiple"
          defaultColDef={{ flex: 1, minWidth: 120 }}
          theme={gridTheme}
          suppressMovableColumns={true}
          context={gridContext}
        />

        {/* Cell detail side panel */}
        <SidePanel
          open={detailPanel !== null}
          title={detailPanel?.field || ""}
          onClose={() => setDetailPanel(null)}
        >
          {detailPanel && (
            <CellDetailContent
              value={detailDisplayValue}
            />
          )}
        </SidePanel>

        {/* Insert row side panel */}
        <SidePanel
          open={showInsertPanel}
          title="Insert Row"
          onClose={() => setShowInsertPanel(false)}
          width={420}
        >
          {showInsertPanel && (
            <InsertRowPanel
              fields={fields}
              onInsert={handleInsertRow}
              onClose={() => setShowInsertPanel(false)}
            />
          )}
        </SidePanel>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#e2e8f0] shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[12px] text-slate-500 tabular-nums px-2">
            {currentPage} / {pageCount || 1}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Rows per page</span>
            <select
              value={limit}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-6 px-1.5 text-[11px] rounded border border-[#e2e8f0] bg-white text-slate-600 outline-none focus:border-[#0f172a] cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-slate-400">
            {total > 0
              ? `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`
              : "0 rows"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Inline component for displaying cell detail in the side panel */
function CellDetailContent({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
        <button
          onClick={handleCopy}
          className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-[12px] font-mono text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50">
        {value}
      </pre>
    </div>
  );
}
