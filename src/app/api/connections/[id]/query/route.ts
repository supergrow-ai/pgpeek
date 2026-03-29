import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/pg-pools";
import db from "@/lib/sqlite";

const WRITE_PATTERNS = /^\s*(INSERT|UPDATE|DELETE|TRUNCATE|UPSERT|MERGE)\b/i;
const SCHEMA_PATTERNS = /^\s*(CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT\s+ON)\b/i;

function getWorkspaceSetting(key: string): unknown {
  const row = db.prepare("SELECT value FROM workspace WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return undefined;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getPool(Number(id));
    const { query } = await req.json();

    // Server-side safety checks
    const readOnly = getWorkspaceSetting("readOnly");
    const noSchemaChanges = getWorkspaceSetting("noSchemaChanges");

    if (readOnly && WRITE_PATTERNS.test(query)) {
      return NextResponse.json(
        { error: "Blocked: Read-only mode is enabled." },
        { status: 403 }
      );
    }
    if (noSchemaChanges && SCHEMA_PATTERNS.test(query)) {
      return NextResponse.json(
        { error: "Blocked: Schema changes are not allowed." },
        { status: 403 }
      );
    }

    const start = Date.now();
    const result = await pool.query(query);
    const duration = Date.now() - start;

    return NextResponse.json({
      rows: result.rows || [],
      fields: (result.fields || []).map((f: { name: string }) => f.name),
      rowCount: result.rowCount,
      duration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
