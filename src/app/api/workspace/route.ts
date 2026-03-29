import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

export async function GET() {
  const rows = db.prepare("SELECT key, value FROM workspace").all() as Array<{
    key: string;
    value: string;
  }>;
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      state[row.key] = row.value;
    }
  }
  return NextResponse.json(state);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const upsert = db.prepare(
    "INSERT INTO workspace (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const tx = db.transaction((entries: Array<[string, unknown]>) => {
    for (const [key, value] of entries) {
      upsert.run(key, JSON.stringify(value));
    }
  });
  tx(Object.entries(body));
  return NextResponse.json({ ok: true });
}
