import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

export async function GET() {
  const rows = db.prepare("SELECT * FROM saved_queries ORDER BY created_at DESC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, query } = await req.json();
  const result = db
    .prepare("INSERT INTO saved_queries (name, query) VALUES (?, ?)")
    .run(name, query);
  return NextResponse.json({ id: result.lastInsertRowid, name, query });
}
