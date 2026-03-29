"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { api, Connection, TableInfo, SavedQuery } from "@/lib/api";
import {
  Database,
  Table2,
  Plus,
  Trash2,
  Terminal,
  Bookmark,
  Unplug,
  PlugZap,
  FolderOpen,
  RefreshCw,
  Shield,
  Lock,
  Search,
} from "lucide-react";

interface SidebarProps {
  activeConnection: Connection | null;
  onConnect: (conn: Connection) => void;
  onDisconnect: () => void;
  onShowConnDialog: () => void;
  connectionsKey: number;
  onOpenTable: (schema: string, table: string) => void;
  onOpenQuery: () => void;
  onOpenSavedQuery: (sq: SavedQuery) => void;
  readOnly: boolean;
  noSchemaChanges: boolean;
  onReadOnlyChange: (v: boolean) => void;
  onNoSchemaChangesChange: (v: boolean) => void;
}

export default function Sidebar({
  activeConnection,
  onConnect,
  onDisconnect,
  onShowConnDialog,
  connectionsKey,
  onOpenTable,
  onOpenQuery,
  onOpenSavedQuery,
  readOnly,
  noSchemaChanges,
  onReadOnlyChange,
  onNoSchemaChangesChange,
}: SidebarProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("public");
  const [tableSearch, setTableSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connDropdownOpen, setConnDropdownOpen] = useState(false);
  const tablesCache = useRef<Map<number, TableInfo[]>>(new Map());

  const loadConnections = async () => {
    try { setConnections(await api.getConnections()); } catch { /* */ }
  };
  const loadSavedQueries = async () => {
    try { setSavedQueries(await api.getSavedQueries()); } catch { /* */ }
  };

  const loadTables = useCallback(async (conn: Connection, force = false) => {
    if (!force && tablesCache.current.has(conn.id)) {
      setTables(tablesCache.current.get(conn.id)!);
      return;
    }
    setRefreshing(true);
    try {
      const t = await api.getTables(conn.id);
      tablesCache.current.set(conn.id, t);
      setTables(t);
      if (!force) {
        const schemas = [...new Set(t.map((x) => x.table_schema))];
        const saved = conn.selected_schema;
        if (saved && schemas.includes(saved)) setSelectedSchema(saved);
        else if (schemas.includes("public")) setSelectedSchema("public");
        else if (schemas.length > 0) setSelectedSchema(schemas[0]);
      }
    } catch { setTables([]); }
    finally { setRefreshing(false); }
  }, []);

  const handleRefreshTables = useCallback(() => {
    if (activeConnection) loadTables(activeConnection, true);
  }, [activeConnection, loadTables]);

  const handleSchemaChange = useCallback((schema: string) => {
    setSelectedSchema(schema);
    if (activeConnection) api.updateConnection(activeConnection.id, { selected_schema: schema });
  }, [activeConnection]);

  useEffect(() => { loadConnections(); loadSavedQueries(); }, [connectionsKey]);
  useEffect(() => {
    if (activeConnection) loadTables(activeConnection);
    else setTables([]);
  }, [activeConnection, loadTables]);

  const handleConnect = async (conn: Connection) => {
    setConnecting(conn.id);
    setError("");
    try { await api.connect(conn.id); onConnect(conn); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Connection failed"); }
    finally { setConnecting(null); }
  };

  const handleDelete = async (id: number) => {
    await api.deleteConnection(id);
    if (activeConnection?.id === id) onDisconnect();
    loadConnections();
  };

  const handleDeleteSavedQuery = async (id: number) => {
    await api.deleteSavedQuery(id);
    loadSavedQueries();
  };

  const schemas = [...new Set(tables.map((t) => t.table_schema))].sort();
  const filteredTables = tables
    .filter((t) => t.table_schema === selectedSchema)
    .filter((t) => !tableSearch || t.table_name.toLowerCase().includes(tableSearch.toLowerCase()))
    .map((t) => t.table_name);

  return (
    <div className="w-[240px] min-w-[240px] border-r border-slate-200/70 bg-white flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-5 h-[52px] flex items-center gap-2.5 border-b border-slate-100">
        <Database className="h-[18px] w-[18px] text-slate-800" />
        <span className="font-semibold text-[14px] text-slate-800 tracking-[-0.01em]">pgpeek</span>
      </div>

      {/* Connection selector */}
      <div className="px-3 pt-3 pb-1 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <button
              onClick={() => setConnDropdownOpen(!connDropdownOpen)}
              className="flex items-center gap-1.5 w-full h-[34px] px-2.5 rounded-md border border-slate-200 bg-slate-50/50 text-left"
            >
              {activeConnection && <div className="w-[6px] h-[6px] rounded-full bg-emerald-500 shrink-0" />}
              {!activeConnection && <PlugZap className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
              <span className="flex-1 text-[13px] text-slate-700 truncate">
                {activeConnection?.name ?? "Select connection..."}
              </span>
              {connecting && (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-slate-400 border-t-transparent animate-spin shrink-0" />
              )}
            </button>

            {/* Custom dropdown */}
            {connDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setConnDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-[38px] z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-[200px] overflow-y-auto">
                  {connections.length === 0 && (
                    <p className="text-[12px] text-slate-400 px-3 py-2 text-center">No connections</p>
                  )}
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`flex items-center justify-between px-2.5 py-[6px] mx-1 rounded-md cursor-pointer group ${
                        activeConnection?.id === conn.id ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => { handleConnect(conn); setConnDropdownOpen(false); }}
                      >
                        <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${
                          activeConnection?.id === conn.id ? "bg-emerald-500" : "bg-slate-200"
                        }`} />
                        <span className="text-[13px] text-slate-700 truncate">{conn.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conn.id);
                          if (connections.length <= 1) setConnDropdownOpen(false);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={onShowConnDialog} className="h-[34px] w-[34px] shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50/50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Add connection">
            <Plus className="h-[14px] w-[14px]" />
          </button>
        </div>
        {error && (
          <div className="px-2 py-1.5 rounded bg-red-50 text-[11px] text-red-600 border border-red-100">{error}</div>
        )}
        {activeConnection && (
          <button
            onClick={onOpenQuery}
            className="w-full h-[34px] flex items-center justify-center gap-2 rounded-md bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
          >
            <Terminal className="h-[14px] w-[14px]" />
            New Query
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 mt-1">
        <div className="px-3 pb-3">

          {/* Tables */}
          {activeConnection && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-1 pt-1 pb-1">
                <span className="text-[11px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Tables</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-300 tabular-nums">{filteredTables.length}</span>
                  <button onClick={handleRefreshTables} className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors">
                    <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Schema */}
              <div className="mb-1.5 flex items-center gap-1.5 px-1">
                <div className="flex items-center gap-1.5 flex-1 h-[30px] px-2 rounded-md border border-slate-200 bg-slate-50/50">
                  <FolderOpen className="h-3 w-3 text-slate-400 shrink-0" />
                  <select
                    value={selectedSchema}
                    onChange={(e) => handleSchemaChange(e.target.value)}
                    className="flex-1 text-[12px] text-slate-600 bg-transparent outline-none cursor-pointer appearance-none"
                  >
                    {schemas.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div className="mb-1.5 px-1">
                <div className="flex items-center gap-1.5 h-[30px] px-2 rounded-md border border-slate-200 bg-slate-50/50">
                  <Search className="h-3 w-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 text-[12px] text-slate-600 bg-transparent outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-[1px]">
                {filteredTables.map((t) => (
                  <button
                    key={`${selectedSchema}.${t}`}
                    className="flex items-center gap-2 w-full px-2 py-[6px] rounded-md text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => onOpenTable(selectedSchema, t)}
                  >
                    <Table2 className="h-[14px] w-[14px] shrink-0 text-slate-300" />
                    <span className="truncate">{t}</span>
                  </button>
                ))}
                {filteredTables.length === 0 && tables.length > 0 && (
                  <p className="text-[12px] text-slate-400 px-2 py-2 text-center">No match</p>
                )}
                {tables.length === 0 && (
                  <p className="text-[12px] text-slate-400 px-2 py-2 text-center">No tables</p>
                )}
              </div>
            </div>
          )}

          {/* Saved Queries */}
          <div>
            <div className="px-1 pt-1 pb-1">
              <span className="text-[11px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Saved Queries</span>
            </div>
            <div className="space-y-[1px]">
              {savedQueries.map((sq) => (
                <div key={sq.id} className="flex items-center justify-between px-2 py-[6px] rounded-md text-[13px] cursor-pointer hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => activeConnection && onOpenSavedQuery(sq)}>
                    <Bookmark className="h-[14px] w-[14px] shrink-0 text-slate-300" />
                    <span className="truncate text-slate-600">{sq.name}</span>
                  </div>
                  <button
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSavedQuery(sq.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {savedQueries.length === 0 && (
                <p className="text-[12px] text-slate-400 px-2 py-2 text-center">No saved queries</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Safety */}
      <div className="px-4 py-3 border-t border-slate-100 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">Read-only</span>
          </div>
          <Switch checked={readOnly} onCheckedChange={onReadOnlyChange} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">No DDL</span>
          </div>
          <Switch checked={noSchemaChanges} onCheckedChange={onNoSchemaChangesChange} size="sm" />
        </div>
      </div>
    </div>
  );
}
