import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as queryPost } from "@/app/api/connections/[id]/query/route";
import { GET as dataGet } from "@/app/api/connections/[id]/tables/[schema]/[table]/data/route";
import { PUT as rowPut, POST as rowPost, DELETE as rowDelete } from "@/app/api/connections/[id]/tables/[schema]/[table]/row/route";
import db from "@/lib/sqlite";
import { makeRequest } from "./helpers";

const { poolQuery, clientQuery, release } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));

vi.mock("@/lib/pg-pools", () => ({
  getPool: () => ({ query: poolQuery, connect: async () => ({ query: clientQuery, release }) }),
}));

function setReadOnly(on: boolean) {
  db.prepare("INSERT INTO workspace (key, value) VALUES ('readOnly', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(on));
}

const result = { rows: [{ id: 1 }], fields: [{ name: "id", dataTypeID: 23 }], rowCount: 1 };
const evil = 'id" IS NULL; DROP TABLE users; --';
const tableParams = { params: Promise.resolve({ id: "1", schema: 'pub"lic', table: 'us"ers' }) };

beforeEach(() => {
  vi.clearAllMocks();
  poolQuery.mockResolvedValue({ ...result, rows: [{ total: "1", oid: 23, typname: "int4" }] });
  clientQuery.mockResolvedValue(result);
});

describe("Table browsing can't be turned into other SQL", () => {
  it("quotes filter columns, sort columns, schema and table", async () => {
    const filters = encodeURIComponent(JSON.stringify([
      { column: evil, operator: "IS NULL", value: "" },
      { column: evil, operator: "IS NOT NULL", value: "" },
      { column: evil, operator: "=", value: "x" },
    ]));
    const url = `http://localhost:3000/api/x?filters=${filters}&sortCol=${encodeURIComponent(evil)}`;
    const res = await dataGet(makeRequest(url), tableParams);

    expect(res.status).toBe(200);
    const sql = poolQuery.mock.calls.map(([text]) => text as string).join("\n");
    expect(sql).toContain('"pub""lic"."us""ers"');
    expect(sql).toContain('"id"" IS NULL; DROP TABLE users; --" IS NULL');
    expect(sql).toContain('ORDER BY "id"" IS NULL; DROP TABLE users; --" ASC');
    expect(sql).not.toContain('"id" IS NULL; DROP');
  });

  it("quotes every name when changing a row", async () => {
    setReadOnly(false);
    const body = { pkColumns: [evil], pkValues: [1], column: evil, value: 2 };
    await rowPut(makeRequest("http://localhost:3000/api/x", { method: "PUT", body }), tableParams);
    await rowPost(makeRequest("http://localhost:3000/api/x", { method: "POST", body: { data: { [evil]: 1 } } }), tableParams);
    await rowDelete(makeRequest("http://localhost:3000/api/x", { method: "DELETE", body: { pkColumns: [evil], pkValues: [1] } }), tableParams);

    const sql = poolQuery.mock.calls.map(([text]) => text as string);
    expect(sql).toHaveLength(3);
    for (const text of sql) {
      expect(text).toContain('"pub""lic"."us""ers"');
      expect(text).toContain('"id"" IS NULL; DROP TABLE users; --"');
      expect(text).not.toContain('"id" IS NULL; DROP');
    }
  });
});

describe("Read-only mode is enforced by Postgres, not by reading the SQL", () => {
  const run = (query: string) =>
    queryPost(makeRequest("http://localhost:3000/api/x", { method: "POST", body: { query } }), { params: Promise.resolve({ id: "1" }) });

  it("runs one statement inside a read-only transaction, then ends it", async () => {
    setReadOnly(true);
    const res = await run("WITH gone AS (DELETE FROM users RETURNING *) SELECT * FROM gone");

    expect(res.status).toBe(200);
    expect(clientQuery.mock.calls[0][0]).toBe("BEGIN TRANSACTION READ ONLY");
    expect(clientQuery.mock.calls[1][0]).toEqual({ text: "WITH gone AS (DELETE FROM users RETURNING *) SELECT * FROM gone", queryMode: "extended" });
    expect(clientQuery.mock.calls[2][0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("reports what Postgres refused, and still ends the transaction", async () => {
    setReadOnly(true);
    clientQuery.mockResolvedValueOnce(result).mockRejectedValueOnce(new Error("cannot execute DELETE in a read-only transaction"));
    const res = await run("SELECT 1");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "cannot execute DELETE in a read-only transaction" });
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("leaves queries alone when read-only is off", async () => {
    setReadOnly(false);
    await run("DELETE FROM users");

    expect(poolQuery).toHaveBeenCalledWith("DELETE FROM users");
    expect(clientQuery).not.toHaveBeenCalled();
  });
});
