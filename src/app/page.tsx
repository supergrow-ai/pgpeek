"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/pg-gui/Sidebar";
import WindowManager, { WindowItem, SortConfig, FilterConfig } from "@/components/pg-gui/WindowManager";
import ConnectionDialog from "@/components/pg-gui/ConnectionDialog";
import { Connection, SavedQuery, api } from "@/lib/api";
import { Database, ArrowRight } from "lucide-react";

type TabData = {
  id: number;
  type: "table" | "query";
  title: string;
  schema?: string;
  table?: string;
  initialQuery?: string;
  savedQueryId?: number;
  sort?: SortConfig | null;
  filters?: FilterConfig[];
  limit?: number;
};

interface WorkspaceState {
  activeConnectionId: number | null;
  // Per-connection tabs: { [connectionId]: { tabs, activeTabId } }
  tabsByConnection: Record<string, { tabs: TabData[]; activeTabId: number | null }>;
  // Legacy flat tabs (backward compat — read-only)
  tabs?: TabData[];
  activeTabId?: number | null;
  windowCounter: number;
  readOnly: boolean;
  noSchemaChanges: boolean;
}

function serializeTabs(windows: WindowItem[]): TabData[] {
  return windows.map((w) => ({
    id: w.id,
    type: w.type,
    title: w.title,
    schema: w.schema,
    table: w.table,
    initialQuery: w.initialQuery,
    savedQueryId: w.savedQueryId,
    sort: w.sort,
    filters: w.filters,
    limit: w.limit,
  }));
}

function deserializeTabs(tabs: TabData[]): WindowItem[] {
  return tabs.map((t) => ({
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
    limit: t.limit,
  }));
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

  // In-memory cache of tabs per connection
  const tabsCache = useRef<Record<string, { tabs: TabData[]; activeTabId: number | null }>>({});

  // Stash current tabs into cache
  const stashCurrentTabs = useCallback(() => {
    if (activeConnection) {
      tabsCache.current[String(activeConnection.id)] = {
        tabs: serializeTabs(windows),
        activeTabId,
      };
    }
  }, [activeConnection, windows, activeTabId]);

  // --- Load workspace on mount ---
  useEffect(() => {
    (async () => {
      try {
        const ws = (await api.getWorkspace()) as Partial<WorkspaceState>;
        const connections = await api.getConnections();

        if (ws.readOnly !== undefined) setReadOnly(ws.readOnly);
        if (ws.noSchemaChanges !== undefined) setNoSchemaChanges(ws.noSchemaChanges);
        if (ws.windowCounter) setWindowCounter(ws.windowCounter);

        // Load per-connection tabs cache
        if (ws.tabsByConnection) {
          tabsCache.current = ws.tabsByConnection;
        }

        // Restore connection
        if (ws.activeConnectionId) {
          const conn = connections.find((c) => c.id === ws.activeConnectionId);
          if (conn) {
            try {
              await api.connect(conn.id);
              setActiveConnection(conn);

              // Restore tabs for this connection
              const connTabs = ws.tabsByConnection?.[String(conn.id)];
              if (connTabs && connTabs.tabs.length > 0) {
                setWindows(deserializeTabs(connTabs.tabs));
                setActiveTabId(connTabs.activeTabId ?? connTabs.tabs[0]?.id ?? null);
              } else if (ws.tabs && ws.tabs.length > 0) {
                // Backward compat: migrate old flat tabs
                setWindows(deserializeTabs(ws.tabs));
                setActiveTabId(ws.activeTabId ?? ws.tabs[0]?.id ?? null);
              }
            } catch {
              // connection failed, skip
            }
          }
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
      // Update cache for current connection
      if (activeConnection) {
        tabsCache.current[String(activeConnection.id)] = {
          tabs: serializeTabs(windows),
          activeTabId,
        };
      }

      const state: WorkspaceState = {
        activeConnectionId: activeConnection?.id ?? null,
        tabsByConnection: { ...tabsCache.current },
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

  const handleTabStateChange = useCallback((id: number, state: { sort?: SortConfig | null; filters?: FilterConfig[]; limit?: number }) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, sort: state.sort, filters: state.filters, limit: state.limit ?? w.limit } : w
      )
    );
  }, []);

  const bringToFront = useCallback((id: number) => {
    setActiveTabId(id);
  }, []);

  // Switch connection: stash current tabs, restore target's tabs
  const handleConnect = useCallback((conn: Connection) => {
    stashCurrentTabs();

    setActiveConnection(conn);

    // Restore tabs for this connection from cache
    const cached = tabsCache.current[String(conn.id)];
    if (cached && cached.tabs.length > 0) {
      setWindows(deserializeTabs(cached.tabs));
      setActiveTabId(cached.activeTabId ?? cached.tabs[0]?.id ?? null);
    } else {
      setWindows([]);
      setActiveTabId(null);
    }
  }, [stashCurrentTabs]);

  const handleDisconnect = useCallback(() => {
    stashCurrentTabs();
    setActiveConnection(null);
    setWindows([]);
    setActiveTabId(null);
  }, [stashCurrentTabs]);

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
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
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
              onOpenQuery={(sql) => addWindow("query", { title: "Query", initialQuery: sql })}
            />
          )}
        </div>

        <ConnectionDialog
          open={showConnDialog}
          onClose={() => setShowConnDialog(false)}
          onCreated={async (conn) => {
            setShowConnDialog(false);
            setConnectionsKey((k) => k + 1);
            try {
              await api.connect(conn.id);
              const fullConn = { id: conn.id, name: conn.name, url: "", selected_schema: "public" };
              handleConnect(fullConn);
            } catch {
              // connection failed, user can connect manually
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
