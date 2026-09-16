import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, query } = await req.json();
  if (typeof name !== "string" || !name.trim() || typeof query !== "string") {
    return NextResponse.json(
      { error: "name and query are required" },
      { status: 400 }
    );
  }
  const result = db
    .prepare("UPDATE saved_queries SET name = ?, query = ? WHERE id = ?")
    .run(name.trim(), query, Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Saved query not found" }, { status: 404 });
  }
  const row = db.prepare("SELECT * FROM saved_queries WHERE id = ?").get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM saved_queries WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
