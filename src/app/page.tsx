"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/pg-gui/Sidebar";
import WindowManager, { WindowItem, SortConfig, FilterConfig } from "@/components/pg-gui/WindowManager";
import ConnectionDialog from "@/components/pg-gui/ConnectionDialog";
import { Connection, SavedQuery, api } from "@/lib/api";
import { Database, ArrowRight } from "lucide-react";

interface WorkspaceState {
  activeConnectionId: number | null;
  tabs: Array<{
    id: number;
    type: "table" | "query";
    title: string;
    schema?: string;
    table?: string;
    initialQuery?: string;
    savedQueryId?: number;
    sort?: SortConfig | null;
    filters?: FilterConfig[];
  }>;
  activeTabId: number | null;
  windowCounter: number;
  readOnly: boolean;
  noSchemaChanges: boolean;
}

export default function Home() {
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [showConnDialog, setShowConnDialog] = useState(false);
  const [windowCounter, setWindowCounter] = useState(0);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [readOnly, setReadOnly] = useState(true);
  const [noSchemaChanges, setNoSchemaChanges] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [connectionsKey, setConnectionsKey] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load workspace on mount ---
  useEffect(() => {
    (async () => {
      try {
        const ws = (await api.getWorkspace()) as Partial<WorkspaceState>;
        const connections = await api.getConnections();

        if (ws.readOnly !== undefined) setReadOnly(ws.readOnly);
        if (ws.noSchemaChanges !== undefined) setNoSchemaChanges(ws.noSchemaChanges);
        if (ws.windowCounter) setWindowCounter(ws.windowCounter);

        // Restore connection
        if (ws.activeConnectionId) {
          const conn = connections.find((c) => c.id === ws.activeConnectionId);
          if (conn) {
            try {
              await api.connect(conn.id);
              setActiveConnection(conn);
            } catch {
              // connection failed, skip
            }
          }
        }

        // Restore tabs
        if (ws.tabs && ws.tabs.length > 0) {
          const restoredWindows: WindowItem[] = ws.tabs.map((t) => ({
            id: t.id,
            type: t.type,
            title: t.title,
            x: 0, y: 0, width: 0, height: 0,
            schema: t.schema,
            table: t.table,
            initialQuery: t.initialQuery,
            savedQueryId: t.savedQueryId,
            sort: t.sort,
            filters: t.filters,
          }));
          setWindows(restoredWindows);
          setActiveTabId(ws.activeTabId ?? restoredWindows[0]?.id ?? null);
        }
      } catch {
        // first run, no workspace yet
      }
      setLoaded(true);
    })();
  }, []);

  // --- Save workspace on state changes (debounced) ---
  useEffect(() => {
    if (!loaded) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const state: WorkspaceState = {
        activeConnectionId: activeConnection?.id ?? null,
        tabs: windows.map((w) => ({
          id: w.id,
          type: w.type,
          title: w.title,
          schema: w.schema,
          table: w.table,
          initialQuery: w.initialQuery,
          savedQueryId: w.savedQueryId,
          sort: w.sort,
          filters: w.filters,
        })),
        activeTabId,
        windowCounter,
        readOnly,
        noSchemaChanges,
      };
      api.saveWorkspace(state as unknown as Record<string, unknown>);
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [loaded, activeConnection, windows, activeTabId, windowCounter, readOnly, noSchemaChanges]);

  const addWindow = useCallback(
    (type: "table" | "query", props: Partial<WindowItem> = {}) => {
      // For table tabs, reuse existing tab if same schema.table is already open
      if (type === "table" && props.schema && props.table) {
        const existing = windows.find(
          (w) => w.type === "table" && w.schema === props.schema && w.table === props.table
        );
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }
      }

      const id = windowCounter + 1;
      setWindowCounter(id);
      const win: WindowItem = {
        id,
        type,
        title: props.title || `Window ${id}`,
        x: 0, y: 0, width: 0, height: 0,
        ...props,
      };
      setWindows((prev) => [...prev, win]);
      setActiveTabId(id);
    },
    [windowCounter, windows]
  );

  const closeWindow = useCallback((id: number) => {
    setWindows((prev) => {
      const next = prev.filter((w) => w.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeTabId]);

  const handleTabStateChange = useCallback((id: number, state: { sort?: SortConfig | null; filters?: FilterConfig[] }) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, sort: state.sort, filters: state.filters } : w
      )
    );
  }, []);

  const bringToFront = useCallback((id: number) => {
    setActiveTabId(id);
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-5 h-5 rounded-full border-2 border-slate-800 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar
          activeConnection={activeConnection}
          onConnect={(conn: Connection) => {
            setActiveConnection(conn);
            setWindows([]);
            setActiveTabId(null);
          }}
          onDisconnect={() => {
            setActiveConnection(null);
            setWindows([]);
            setActiveTabId(null);
          }}
          onShowConnDialog={() => setShowConnDialog(true)}
          connectionsKey={connectionsKey}
          onOpenTable={(schema: string, table: string) =>
            addWindow("table", { title: table, schema, table })
          }
          onOpenQuery={() => addWindow("query", { title: "Query Editor" })}
          onOpenSavedQuery={(sq: SavedQuery) =>
            addWindow("query", {
              title: sq.name,
              initialQuery: sq.query,
              savedQueryId: sq.id,
            })
          }
          readOnly={readOnly}
          noSchemaChanges={noSchemaChanges}
          onReadOnlyChange={setReadOnly}
          onNoSchemaChangesChange={setNoSchemaChanges}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          {windows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-5 max-w-sm">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center">
                  <Database className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-[16px] font-semibold text-slate-800 tracking-[-0.01em]">
                    {activeConnection
                      ? `Connected to ${activeConnection.name}`
                      : "pgpeek"}
                  </h1>
                  <p className="text-[13px] text-slate-400 leading-relaxed">
                    {activeConnection
                      ? "Select a table or open a query editor."
                      : "Connect to a PostgreSQL database to get started."}
                  </p>
                </div>
                {!activeConnection && (
                  <button
                    onClick={() => setShowConnDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
                  >
                    Add Connection
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <WindowManager
              windows={windows}
              activeConnection={activeConnection}
              onClose={closeWindow}
              onFocus={bringToFront}
              readOnly={readOnly}
              noSchemaChanges={noSchemaChanges}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onTabStateChange={handleTabStateChange}
            />
          )}
        </div>

        <ConnectionDialog
          open={showConnDialog}
          onClose={() => setShowConnDialog(false)}
          onCreated={() => { setShowConnDialog(false); setConnectionsKey((k) => k + 1); }}
        />
      </div>
    </TooltipProvider>
  );
}
