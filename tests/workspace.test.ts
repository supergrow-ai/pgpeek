import { describe, it, expect } from "vitest";
import { GET, PUT } from "@/app/api/workspace/route";
import { makeRequest, parseJson } from "./helpers";

describe("Workspace API", () => {
  it("GET /api/workspace returns empty object initially", async () => {
    const res = await GET();
    const data = await parseJson(res);
    expect(res.status).toBe(200);
    expect(data).toEqual({});
  });

  it("PUT /api/workspace saves and retrieves state", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        activeConnectionId: 1,
        readOnly: true,
        noSchemaChanges: false,
        tabs: [{ id: 1, type: "table", title: "users" }],
      },
    });
    const putRes = await PUT(putReq);
    expect(putRes.status).toBe(200);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    expect(data.activeConnectionId).toBe(1);
    expect(data.readOnly).toBe(true);
    expect(data.noSchemaChanges).toBe(false);
    expect(data.tabs).toEqual([{ id: 1, type: "table", title: "users" }]);
  });

  it("PUT /api/workspace persists tab sort and filter state", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [
          {
            id: 1,
            type: "table",
            title: "users",
            schema: "public",
            table: "users",
            sort: { column: "created_at", direction: "DESC" },
            filters: [
              { column: "status", operator: "=", value: "active" },
              { column: "age", operator: ">", value: "18" },
            ],
          },
          {
            id: 2,
            type: "table",
            title: "orders",
            schema: "public",
            table: "orders",
            sort: null,
            filters: [],
          },
        ],
      },
    });
    await PUT(putReq);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tabs = data.tabs as Array<Record<string, unknown>>;

    // Tab 1 should have sort and filters preserved
    expect(tabs[0].sort).toEqual({ column: "created_at", direction: "DESC" });
    expect(tabs[0].filters).toEqual([
      { column: "status", operator: "=", value: "active" },
      { column: "age", operator: ">", value: "18" },
    ]);

    // Tab 2 should have null sort and empty filters
    expect(tabs[1].sort).toBeNull();
    expect(tabs[1].filters).toEqual([]);
  });

  it("PUT /api/workspace persists updated sort/filter after change", async () => {
    // Save initial state with no sort
    const req1 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [{ id: 1, type: "table", title: "users", sort: null, filters: [] }],
      },
    });
    await PUT(req1);

    // Update with sort and filter
    const req2 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [
          {
            id: 1,
            type: "table",
            title: "users",
            sort: { column: "name", direction: "ASC" },
            filters: [{ column: "email", operator: "ILIKE", value: "%@gmail.com" }],
          },
        ],
      },
    });
    await PUT(req2);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tabs = data.tabs as Array<Record<string, unknown>>;
    expect(tabs[0].sort).toEqual({ column: "name", direction: "ASC" });
    expect(tabs[0].filters).toEqual([{ column: "email", operator: "ILIKE", value: "%@gmail.com" }]);
  });

  it("PUT /api/workspace clears sort/filter when reset", async () => {
    // Save state with sort and filter
    const req1 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [
          {
            id: 1,
            type: "table",
            title: "users",
            sort: { column: "id", direction: "DESC" },
            filters: [{ column: "active", operator: "=", value: "true" }],
          },
        ],
      },
    });
    await PUT(req1);

    // Clear sort/filter
    const req2 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [{ id: 1, type: "table", title: "users", sort: null, filters: [] }],
      },
    });
    await PUT(req2);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tabs = data.tabs as Array<Record<string, unknown>>;
    expect(tabs[0].sort).toBeNull();
    expect(tabs[0].filters).toEqual([]);
  });

  it("PUT /api/workspace preserves sort/filter across multiple tabs independently", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabs: [
          {
            id: 1, type: "table", title: "users",
            sort: { column: "name", direction: "ASC" },
            filters: [{ column: "role", operator: "=", value: "admin" }],
          },
          {
            id: 2, type: "table", title: "orders",
            sort: { column: "total", direction: "DESC" },
            filters: [],
          },
          {
            id: 3, type: "query", title: "My Query",
          },
        ],
      },
    });
    await PUT(putReq);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tabs = data.tabs as Array<Record<string, unknown>>;

    expect(tabs[0].sort).toEqual({ column: "name", direction: "ASC" });
    expect(tabs[0].filters).toEqual([{ column: "role", operator: "=", value: "admin" }]);
    expect(tabs[1].sort).toEqual({ column: "total", direction: "DESC" });
    expect(tabs[1].filters).toEqual([]);
    // Query tab has no sort/filters
    expect(tabs[2].sort).toBeUndefined();
    expect(tabs[2].filters).toBeUndefined();
  });

  it("stores tabs per connection independently", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        activeConnectionId: 1,
        tabsByConnection: {
          "1": {
            tabs: [
              { id: 1, type: "table", title: "users", schema: "public", table: "users" },
              { id: 2, type: "table", title: "orders", schema: "public", table: "orders" },
            ],
            activeTabId: 2,
          },
          "2": {
            tabs: [
              { id: 3, type: "table", title: "products", schema: "public", table: "products" },
            ],
            activeTabId: 3,
          },
        },
      },
    });
    await PUT(putReq);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tbc = data.tabsByConnection as Record<string, { tabs: unknown[]; activeTabId: number }>;

    // Connection 1 has 2 tabs
    expect(tbc["1"].tabs).toHaveLength(2);
    expect(tbc["1"].activeTabId).toBe(2);

    // Connection 2 has 1 tab
    expect(tbc["2"].tabs).toHaveLength(1);
    expect(tbc["2"].activeTabId).toBe(3);
  });

  it("switching connections preserves each connection's tabs", async () => {
    // Save connection 1 tabs
    const req1 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        activeConnectionId: 1,
        tabsByConnection: {
          "1": {
            tabs: [
              { id: 1, type: "table", title: "users", sort: { column: "name", direction: "ASC" }, filters: [] },
            ],
            activeTabId: 1,
          },
        },
      },
    });
    await PUT(req1);

    // "Switch" to connection 2 — add its tabs without losing connection 1's
    const req2 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        activeConnectionId: 2,
        tabsByConnection: {
          "1": {
            tabs: [
              { id: 1, type: "table", title: "users", sort: { column: "name", direction: "ASC" }, filters: [] },
            ],
            activeTabId: 1,
          },
          "2": {
            tabs: [
              { id: 2, type: "query", title: "Query Editor" },
            ],
            activeTabId: 2,
          },
        },
      },
    });
    await PUT(req2);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tbc = data.tabsByConnection as Record<string, { tabs: Array<Record<string, unknown>>; activeTabId: number }>;

    // Connection 1's tabs still intact with sort
    expect(tbc["1"].tabs).toHaveLength(1);
    expect(tbc["1"].tabs[0].title).toBe("users");
    expect(tbc["1"].tabs[0].sort).toEqual({ column: "name", direction: "ASC" });

    // Connection 2 has its own tab
    expect(tbc["2"].tabs).toHaveLength(1);
    expect(tbc["2"].tabs[0].title).toBe("Query Editor");

    // Active connection is 2
    expect(data.activeConnectionId).toBe(2);
  });

  it("per-connection tabs preserve sort and filter independently", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabsByConnection: {
          "1": {
            tabs: [
              {
                id: 1, type: "table", title: "users",
                sort: { column: "created_at", direction: "DESC" },
                filters: [{ column: "status", operator: "=", value: "active" }],
              },
            ],
            activeTabId: 1,
          },
          "2": {
            tabs: [
              {
                id: 2, type: "table", title: "logs",
                sort: { column: "timestamp", direction: "ASC" },
                filters: [{ column: "level", operator: "=", value: "error" }],
              },
            ],
            activeTabId: 2,
          },
        },
      },
    });
    await PUT(putReq);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tbc = data.tabsByConnection as Record<string, { tabs: Array<Record<string, unknown>> }>;

    // Connection 1 sort/filter
    expect(tbc["1"].tabs[0].sort).toEqual({ column: "created_at", direction: "DESC" });
    expect(tbc["1"].tabs[0].filters).toEqual([{ column: "status", operator: "=", value: "active" }]);

    // Connection 2 sort/filter — completely independent
    expect(tbc["2"].tabs[0].sort).toEqual({ column: "timestamp", direction: "ASC" });
    expect(tbc["2"].tabs[0].filters).toEqual([{ column: "level", operator: "=", value: "error" }]);
  });

  it("backward compat: old flat tabs format is still readable", async () => {
    // Save in old format (flat tabs, no tabsByConnection)
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        activeConnectionId: 1,
        tabs: [
          { id: 1, type: "table", title: "legacy_table" },
        ],
        activeTabId: 1,
      },
    });
    await PUT(putReq);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;

    // Old tabs field should still be readable
    const tabs = data.tabs as Array<Record<string, unknown>>;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe("legacy_table");
    expect(data.activeTabId).toBe(1);
  });

  it("deleting a connection does not affect other connections' tabs", async () => {
    const putReq = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabsByConnection: {
          "1": { tabs: [{ id: 1, type: "table", title: "users" }], activeTabId: 1 },
          "2": { tabs: [{ id: 2, type: "table", title: "orders" }], activeTabId: 2 },
          "3": { tabs: [{ id: 3, type: "query", title: "My SQL" }], activeTabId: 3 },
        },
      },
    });
    await PUT(putReq);

    // Remove connection 2's tabs (simulating delete)
    const putReq2 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: {
        tabsByConnection: {
          "1": { tabs: [{ id: 1, type: "table", title: "users" }], activeTabId: 1 },
          "3": { tabs: [{ id: 3, type: "query", title: "My SQL" }], activeTabId: 3 },
        },
      },
    });
    await PUT(putReq2);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    const tbc = data.tabsByConnection as Record<string, unknown>;

    expect(tbc["1"]).toBeDefined();
    expect(tbc["2"]).toBeUndefined();
    expect(tbc["3"]).toBeDefined();
  });

  it("PUT /api/workspace upserts existing keys", async () => {
    // Set initial
    const req1 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: { readOnly: true, noSchemaChanges: true },
    });
    await PUT(req1);

    // Update one key
    const req2 = makeRequest("http://localhost:3000/api/workspace", {
      method: "PUT",
      body: { readOnly: false },
    });
    await PUT(req2);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Record<string, unknown>;
    expect(data.readOnly).toBe(false);
    expect(data.noSchemaChanges).toBe(true); // unchanged
  });
});
