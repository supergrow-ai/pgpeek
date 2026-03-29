import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, query } = await req.json();
  db.prepare("UPDATE saved_queries SET name = ?, query = ? WHERE id = ?").run(
    name,
    query,
    id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM saved_queries WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
