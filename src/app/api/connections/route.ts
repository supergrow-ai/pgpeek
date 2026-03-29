import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

export async function GET() {
  const rows = db.prepare("SELECT id, name, selected_schema, created_at FROM connections ORDER BY created_at DESC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, url } = await req.json();
  const result = db
    .prepare("INSERT INTO connections (name, url) VALUES (?, ?)")
    .run(name, url);
  return NextResponse.json({ id: result.lastInsertRowid });
}
