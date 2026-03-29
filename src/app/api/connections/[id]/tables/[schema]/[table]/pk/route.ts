import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/pg-pools";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; schema: string; table: string }> }
) {
  try {
    const { id, schema, table } = await params;
    const pool = getPool(Number(id));
    const result = await pool.query(
      `SELECT a.attname as column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE i.indisprimary AND c.relname = $1 AND n.nspname = $2`,
      [table, schema]
    );
    return NextResponse.json(result.rows.map((r) => r.column_name));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
