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
