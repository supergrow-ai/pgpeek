import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isLocalRequest } from "@/lib/local-only";
import { quoteIdent } from "@/lib/sql";
import { proxy, config } from "@/proxy";

function request(headers: Record<string, string>) {
  return new Headers(headers);
}

describe("Only this computer's own pages reach the API", () => {
  it("allows the app itself, in every way a browser addresses it", () => {
    expect(isLocalRequest(request({ host: "localhost:3000" }))).toBe(true);
    expect(isLocalRequest(request({ host: "127.0.0.1:3001" }))).toBe(true);
    expect(isLocalRequest(request({ host: "[::1]:3000" }))).toBe(true);
    expect(isLocalRequest(request({ host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isLocalRequest(request({ host: "localhost:3000", "sec-fetch-site": "none" }))).toBe(true);
  });

  it("refuses a website that renamed itself to this address (DNS rebinding)", () => {
    expect(isLocalRequest(request({ host: "evil.example:3000" }))).toBe(false);
    expect(isLocalRequest(request({ host: "localhost.evil.example" }))).toBe(false);
    expect(isLocalRequest(request({}))).toBe(false);
  });

  it("refuses a request sent from another website", () => {
    expect(isLocalRequest(request({ host: "localhost:3000", origin: "https://evil.example" }))).toBe(false);
    expect(isLocalRequest(request({ host: "localhost:3000", origin: "http://localhost:3001" }))).toBe(false);
    expect(isLocalRequest(request({ host: "localhost:3000", origin: "null" }))).toBe(false);
  });

  it("refuses a cross-site GET, which carries no Origin (an <img> tag)", () => {
    expect(isLocalRequest(request({ host: "localhost:3000", "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isLocalRequest(request({ host: "localhost:3000", "sec-fetch-site": "same-site" }))).toBe(false);
  });

  it("the proxy answers 403 and covers every API route", async () => {
    const blocked = proxy(new NextRequest("http://localhost:3000/api/connections", { headers: { host: "evil.example" } }));
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({ error: "Blocked: this request didn't come from pgpeek." });

    const allowed = proxy(new NextRequest("http://localhost:3000/api/connections", { headers: { host: "localhost:3000" } }));
    expect(allowed.status).toBe(200);
    expect(config.matcher).toBe("/api/:path*");
  });
});

describe("quoteIdent", () => {
  it("quotes a name and doubles any quote inside it, so it can't break out", () => {
    expect(quoteIdent("users")).toBe('"users"');
    expect(quoteIdent('a"b')).toBe('"a""b"');
    expect(quoteIdent('id" IS NULL; DROP TABLE users; --')).toBe('"id"" IS NULL; DROP TABLE users; --"');
  });
});
