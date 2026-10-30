import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/pg-pools";
import { quoteIdent } from "@/lib/sql";
import db from "@/lib/sqlite";

function isReadOnly(): boolean {
  const row = db.prepare("SELECT value FROM workspace WHERE key = 'readOnly'").get() as { value: string } | undefined;
  if (!row) return true; // default to read-only
  try { return JSON.parse(row.value) === true; } catch { return true; }
}

const BLOCKED = { error: "Blocked: Read-only mode is enabled." };

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; schema: string; table: string }> }
) {
  if (isReadOnly()) return NextResponse.json(BLOCKED, { status: 403 });
  try {
    const { id, schema, table } = await params;
    const pool = getPool(Number(id));
    const { pkColumns, pkValues, column, value } = await req.json();

    const whereClauses = pkColumns.map(
      (col: string, i: number) => `${quoteIdent(col)} = $${i + 1}`
    );
    const queryParams = [...pkValues, value];

    await pool.query(
      `UPDATE ${quoteIdent(schema)}.${quoteIdent(table)} SET ${quoteIdent(column)} = $${queryParams.length} WHERE ${whereClauses.join(" AND ")}`,
      queryParams
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; schema: string; table: string }> }
) {
  if (isReadOnly()) return NextResponse.json(BLOCKED, { status: 403 });
  try {
    const { id, schema, table } = await params;
    const pool = getPool(Number(id));
    const { data } = await req.json();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const result = await pool.query(
      `INSERT INTO ${quoteIdent(schema)}.${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values
    );
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; schema: string; table: string }> }
) {
  if (isReadOnly()) return NextResponse.json(BLOCKED, { status: 403 });
  try {
    const { id, schema, table } = await params;
    const pool = getPool(Number(id));
    const { pkColumns, pkValues } = await req.json();

    const whereClauses = pkColumns.map(
      (col: string, i: number) => `${quoteIdent(col)} = $${i + 1}`
    );
    await pool.query(
      `DELETE FROM ${quoteIdent(schema)}.${quoteIdent(table)} WHERE ${whereClauses.join(" AND ")}`,
      pkValues
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
