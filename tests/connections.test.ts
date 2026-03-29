import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/connections/route";
import { DELETE, PATCH } from "@/app/api/connections/[id]/route";
import { makeRequest, parseJson } from "./helpers";

describe("Connections API", () => {
  it("GET /api/connections returns empty array initially", async () => {
    const res = await GET();
    const data = (await parseJson(res)) as Array<unknown>;
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("POST /api/connections creates a connection", async () => {
    const req = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Test DB", url: "postgresql://user:pass@localhost:5432/testdb" },
    });
    const res = await POST(req);
    const data = (await parseJson(res)) as { id: number };
    expect(res.status).toBe(200);
    expect(data.id).toBeDefined();
  });

  it("GET /api/connections does NOT expose connection URL", async () => {
    // Create a connection first
    const createReq = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Secret DB", url: "postgresql://admin:supersecret@prod:5432/mydb" },
    });
    await POST(createReq);

    const res = await GET();
    const data = (await parseJson(res)) as Array<Record<string, unknown>>;
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("Secret DB");
    // URL must NOT be in the response
    expect(data[0].url).toBeUndefined();
    expect(data[0].password).toBeUndefined();
    // Only safe fields
    expect(data[0].id).toBeDefined();
    expect(data[0].selected_schema).toBe("public");
  });

  it("PATCH /api/connections/:id updates selected_schema", async () => {
    const createReq = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Schema Test", url: "postgresql://u:p@h:5432/d" },
    });
    const createRes = (await parseJson(await POST(createReq))) as { id: number };

    const patchReq = makeRequest(`http://localhost:3000/api/connections/${createRes.id}`, {
      method: "PATCH",
      body: { selected_schema: "analytics" },
    });
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(createRes.id) }),
    });
    expect(patchRes.status).toBe(200);

    // Verify it persisted
    const getRes = await GET();
    const data = (await parseJson(getRes)) as Array<Record<string, unknown>>;
    expect(data[0].selected_schema).toBe("analytics");
  });

  it("DELETE /api/connections/:id removes a connection", async () => {
    const createReq = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "To Delete", url: "postgresql://u:p@h:5432/d" },
    });
    const createRes = (await parseJson(await POST(createReq))) as { id: number };

    const deleteReq = makeRequest(`http://localhost:3000/api/connections/${createRes.id}`, {
      method: "DELETE",
    });
    const deleteRes = await DELETE(deleteReq, {
      params: Promise.resolve({ id: String(createRes.id) }),
    });
    expect(deleteRes.status).toBe(200);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Array<unknown>;
    expect(data).toEqual([]);
  });

  it("DELETE /api/connections/:id only deletes the specified connection", async () => {
    // Create two connections
    const req1 = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Keep Me", url: "postgresql://u:p@h:5432/keep" },
    });
    const req2 = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Delete Me", url: "postgresql://u:p@h:5432/delete" },
    });
    await POST(req1);
    const created2 = (await parseJson(await POST(req2))) as { id: number };

    // Delete only the second one
    const deleteReq = makeRequest(`http://localhost:3000/api/connections/${created2.id}`, {
      method: "DELETE",
    });
    await DELETE(deleteReq, {
      params: Promise.resolve({ id: String(created2.id) }),
    });

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Array<Record<string, unknown>>;
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("Keep Me");
  });

  it("DELETE /api/connections/:id returns ok even for non-existent id", async () => {
    const deleteReq = makeRequest("http://localhost:3000/api/connections/9999", {
      method: "DELETE",
    });
    const res = await DELETE(deleteReq, {
      params: Promise.resolve({ id: "9999" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/connections/:id does not expose URL in response", async () => {
    const createReq = makeRequest("http://localhost:3000/api/connections", {
      method: "POST",
      body: { name: "Secret", url: "postgresql://admin:hunter2@prod:5432/db" },
    });
    const created = (await parseJson(await POST(createReq))) as { id: number };

    const deleteReq = makeRequest(`http://localhost:3000/api/connections/${created.id}`, {
      method: "DELETE",
    });
    const res = await DELETE(deleteReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    const body = JSON.stringify(await parseJson(res));
    expect(body).not.toContain("hunter2");
    expect(body).not.toContain("postgresql://");
  });
});
