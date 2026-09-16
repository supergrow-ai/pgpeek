import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/saved-queries/route";
import { PUT, DELETE } from "@/app/api/saved-queries/[id]/route";
import { makeRequest, parseJson } from "./helpers";

describe("Saved Queries API", () => {
  it("GET /api/saved-queries returns empty array initially", async () => {
    const res = await GET();
    const data = (await parseJson(res)) as Array<unknown>;
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("POST /api/saved-queries creates a query", async () => {
    const req = makeRequest("http://localhost:3000/api/saved-queries", {
      method: "POST",
      body: { name: "Users count", query: "SELECT COUNT(*) FROM users" },
    });
    const res = await POST(req);
    const data = (await parseJson(res)) as { id: number; name: string; query: string };
    expect(res.status).toBe(200);
    expect(data.name).toBe("Users count");
    expect(data.query).toBe("SELECT COUNT(*) FROM users");
  });

  it("PUT /api/saved-queries/:id updates a query", async () => {
    const createReq = makeRequest("http://localhost:3000/api/saved-queries", {
      method: "POST",
      body: { name: "Old name", query: "SELECT 1" },
    });
    const created = (await parseJson(await POST(createReq))) as { id: number };

    const putReq = makeRequest(`http://localhost:3000/api/saved-queries/${created.id}`, {
      method: "PUT",
      body: { name: "New name", query: "SELECT 2" },
    });
    const putRes = await PUT(putReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(putRes.status).toBe(200);

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Array<Record<string, unknown>>;
    expect(data[0].name).toBe("New name");
    expect(data[0].query).toBe("SELECT 2");
  });

  it("DELETE /api/saved-queries/:id removes a query", async () => {
    const createReq = makeRequest("http://localhost:3000/api/saved-queries", {
      method: "POST",
      body: { name: "To delete", query: "SELECT 1" },
    });
    const created = (await parseJson(await POST(createReq))) as { id: number };

    const deleteReq = makeRequest(`http://localhost:3000/api/saved-queries/${created.id}`, {
      method: "DELETE",
    });
    await DELETE(deleteReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });

    const getRes = await GET();
    const data = (await parseJson(getRes)) as Array<unknown>;
    expect(data).toEqual([]);
  });
});

describe("Saved Queries API — update semantics", () => {
  it("PUT returns the updated row", async () => {
    const created = (await parseJson(
      await POST(
        makeRequest("http://localhost:3000/api/saved-queries", {
          method: "POST",
          body: { name: "Orig", query: "SELECT 1" },
        })
      )
    )) as { id: number };

    const res = await PUT(
      makeRequest(`http://localhost:3000/api/saved-queries/${created.id}`, {
        method: "PUT",
        body: { name: "  Renamed  ", query: "SELECT 2" },
      }),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    const data = (await parseJson(res)) as { id: number; name: string; query: string };
    expect(res.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.name).toBe("Renamed");
    expect(data.query).toBe("SELECT 2");
  });

  it("PUT returns 404 for an unknown id", async () => {
    const res = await PUT(
      makeRequest("http://localhost:3000/api/saved-queries/9999", {
        method: "PUT",
        body: { name: "x", query: "SELECT 1" },
      }),
      { params: Promise.resolve({ id: "9999" }) }
    );
    expect(res.status).toBe(404);
  });

  it("PUT returns 400 when name is blank", async () => {
    const created = (await parseJson(
      await POST(
        makeRequest("http://localhost:3000/api/saved-queries", {
          method: "POST",
          body: { name: "Keep me", query: "SELECT 1" },
        })
      )
    )) as { id: number };

    const res = await PUT(
      makeRequest(`http://localhost:3000/api/saved-queries/${created.id}`, {
        method: "PUT",
        body: { name: "   ", query: "SELECT 2" },
      }),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    expect(res.status).toBe(400);

    const list = (await parseJson(await GET())) as Array<{ name: string; query: string }>;
    expect(list[0].name).toBe("Keep me");
    expect(list[0].query).toBe("SELECT 1");
  });
});
