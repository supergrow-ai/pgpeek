import { describe, it, expect, vi } from "vitest";
import { POST as queryPost } from "@/app/api/connections/[id]/query/route";
import {
  PUT as rowPut,
  POST as rowPost,
  DELETE as rowDelete,
} from "@/app/api/connections/[id]/tables/[schema]/[table]/row/route";
import { GET as connectionsGet } from "@/app/api/connections/route";
import { POST as connectionsPost } from "@/app/api/connections/route";
import db from "@/lib/sqlite";
import { makeRequest, parseJson } from "./helpers";

// Mock pg pool so we don't need a real database
vi.mock("@/lib/pg-pools", () => ({
  getPool: () => ({
    query: vi.fn().mockResolvedValue({
      rows: [{ id: 1 }],
      fields: [{ name: "id" }],
      rowCount: 1,
    }),
  }),
  setPool: vi.fn(),
  removePool: vi.fn(),
  pools: new Map(),
}));

function setWorkspaceSetting(key: string, value: unknown) {
  db.prepare(
    "INSERT INTO workspace (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, JSON.stringify(value));
}

const rowParams = Promise.resolve({ id: "1", schema: "public", table: "users" });
const queryParams = Promise.resolve({ id: "1" });

describe("Security: Read-only mode enforcement (server-side)", () => {
  it("blocks INSERT queries when read-only is on", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "INSERT INTO users (name) VALUES ('test')" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
    const data = (await parseJson(res)) as { error: string };
    expect(data.error).toContain("Read-only");
  });

  it("blocks UPDATE queries when read-only is on", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "UPDATE users SET name = 'hacked'" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE queries when read-only is on", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "DELETE FROM users" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
  });

  it("blocks TRUNCATE queries when read-only is on", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "TRUNCATE users" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
  });

  it("allows SELECT queries when read-only is on", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "SELECT * FROM users" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(200);
  });

  it("allows write queries when read-only is off", async () => {
    setWorkspaceSetting("readOnly", false);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "INSERT INTO users (name) VALUES ('test')" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(200);
  });
});

describe("Security: No-DDL mode enforcement (server-side)", () => {
  it("blocks CREATE TABLE when no-DDL is on", async () => {
    setWorkspaceSetting("readOnly", false);
    setWorkspaceSetting("noSchemaChanges", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "CREATE TABLE evil (id int)" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
    const data = (await parseJson(res)) as { error: string };
    expect(data.error).toContain("Schema changes");
  });

  it("blocks DROP TABLE when no-DDL is on", async () => {
    setWorkspaceSetting("readOnly", false);
    setWorkspaceSetting("noSchemaChanges", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "DROP TABLE users" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
  });

  it("blocks ALTER TABLE when no-DDL is on", async () => {
    setWorkspaceSetting("readOnly", false);
    setWorkspaceSetting("noSchemaChanges", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "ALTER TABLE users ADD COLUMN evil text" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(403);
  });

  it("allows DDL when no-DDL is off", async () => {
    setWorkspaceSetting("readOnly", false);
    setWorkspaceSetting("noSchemaChanges", false);
    const req = makeRequest("http://localhost:3000/api/connections/1/query", {
      method: "POST",
      body: { query: "CREATE TABLE allowed (id int)" },
    });
    const res = await queryPost(req, { params: queryParams });
    expect(res.status).toBe(200);
  });
});

describe("Security: Row mutation endpoints respect read-only", () => {
  it("PUT /row blocked when read-only", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/tables/public/users/row", {
      method: "PUT",
      body: { pkColumns: ["id"], pkValues: [1], column: "name", value: "hacked" },
    });
    const res = await rowPut(req, { params: rowParams });
    expect(res.status).toBe(403);
  });

  it("POST /row blocked when read-only", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/tables/public/users/row", {
      method: "POST",
      body: { data: { name: "new user" } },
    });
    const res = await rowPost(req, { params: rowParams });
    expect(res.status).toBe(403);
  });

  it("DELETE /row blocked when read-only", async () => {
    setWorkspaceSetting("readOnly", true);
    const req = makeRequest("http://localhost:3000/api/connections/1/tables/public/users/row", {
      method: "DELETE",
      body: { pkColumns: ["id"], pkValues: [1] },
    });
    const res = await rowDelete(req, { params: rowParams });
    expect(res.status).toBe(403);
  });

  it("PUT /row allowed when read-only is off", async () => {
    setWorkspaceSetting("readOnly", false);
    const req = makeRequest("http://localhost:3000/api/connections/1/tables/public/users/row", {
      method: "PUT",
      body: { pkColumns: ["id"], pkValues: [1], column: "name", value: "allowed" },
    });
    const res = await rowPut(req, { params: rowParams });
    expect(res.status).toBe(200);
  });
});

describe("Security: Credential exposure", () => {
  it("GET /api/connections never returns the connection URL", async () => {
    // Create a connection with a secret password
    const createReq = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Prod", url: "postgresql://admin:s3cret_p4ss@prod.db:5432/app" },
    });
    await connectionsPost(createReq);

    const res = await connectionsGet();
    const data = (await parseJson(res)) as Array<Record<string, unknown>>;
    const conn = data.find((c) => c.name === "Prod");
    expect(conn).toBeDefined();

    // Must not contain URL or any credential fields
    expect(conn!.url).toBeUndefined();
    expect(conn!.password).toBeUndefined();
    expect(JSON.stringify(conn)).not.toContain("s3cret_p4ss");
    expect(JSON.stringify(conn)).not.toContain("prod.db");

    // Should only have safe fields
    expect(conn!.id).toBeDefined();
    expect(conn!.selected_schema).toBe("public");
  });
});
