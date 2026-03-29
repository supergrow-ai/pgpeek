import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/sqlite";
import { removePool } from "@/lib/pg-pools";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (body.selected_schema !== undefined) {
    db.prepare("UPDATE connections SET selected_schema = ? WHERE id = ?").run(
      body.selected_schema,
      id
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  removePool(Number(id));
  db.prepare("DELETE FROM connections WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
