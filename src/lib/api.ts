async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export interface Connection {
  id: number;
  name: string;
  url: string;
  selected_schema: string;
}

export interface TableInfo {
  table_schema: string;
  table_name: string;
}

export interface TableData {
  rows: Record<string, unknown>[];
  fields: string[];
  total: number;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  fields: string[];
  rowCount: number;
  duration: number;
}

export interface SavedQuery {
  id: number;
  name: string;
  query: string;
  created_at: string;
}

export const api = {
  getConnections: (): Promise<Connection[]> => request("/connections"),
  addConnection: (conn: { name: string; url: string }) =>
    request("/connections", { method: "POST", body: JSON.stringify(conn) }),
  updateConnection: (id: number, data: Partial<{ selected_schema: string }>) =>
    request(`/connections/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteConnection: (id: number) =>
    request(`/connections/${id}`, { method: "DELETE" }),
  connect: (id: number) =>
    request(`/connections/${id}/connect`, { method: "POST" }),

  getTables: (connId: number): Promise<TableInfo[]> =>
    request(`/connections/${connId}/tables`),
  getPrimaryKeys: (connId: number, schema: string, table: string): Promise<string[]> =>
    request(`/connections/${connId}/tables/${schema}/${table}/pk`),

  getTableData: (
    connId: number,
    schema: string,
    table: string,
    limit = 100,
    offset = 0,
    sort?: { column: string; direction: "ASC" | "DESC" } | null,
    filters?: Array<{ column: string; operator: string; value: string }>
  ): Promise<TableData> => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (sort) {
      params.set("sortCol", sort.column);
      params.set("sortDir", sort.direction);
    }
    if (filters && filters.length > 0) {
      params.set("filters", JSON.stringify(filters));
    }
    return request(
      `/connections/${connId}/tables/${schema}/${table}/data?${params.toString()}`
    );
  },

  updateCell: (
    connId: number,
    schema: string,
    table: string,
    body: { pkColumns: string[]; pkValues: unknown[]; column: string; value: unknown }
  ) =>
    request(`/connections/${connId}/tables/${schema}/${table}/row`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  insertRow: (connId: number, schema: string, table: string, data: Record<string, unknown>) =>
    request(`/connections/${connId}/tables/${schema}/${table}/row`, {
      method: "POST",
      body: JSON.stringify({ data }),
    }),

  deleteRow: (
    connId: number,
    schema: string,
    table: string,
    body: { pkColumns: string[]; pkValues: unknown[] }
  ) =>
    request(`/connections/${connId}/tables/${schema}/${table}/row`, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  runQuery: (connId: number, query: string): Promise<QueryResult> =>
    request(`/connections/${connId}/query`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  getSavedQueries: (): Promise<SavedQuery[]> => request("/saved-queries"),
  saveQuery: (name: string, query: string) =>
    request("/saved-queries", {
      method: "POST",
      body: JSON.stringify({ name, query }),
    }),
  updateSavedQuery: (id: number, name: string, query: string) =>
    request(`/saved-queries/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, query }),
    }),
  deleteSavedQuery: (id: number) =>
    request(`/saved-queries/${id}`, { method: "DELETE" }),

  // Workspace state
  getWorkspace: (): Promise<Record<string, unknown>> => request("/workspace"),
  saveWorkspace: (state: Record<string, unknown>) =>
    request("/workspace", { method: "PUT", body: JSON.stringify(state) }),
};
