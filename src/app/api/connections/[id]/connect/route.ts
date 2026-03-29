import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import db from "@/lib/sqlite";
import { setPool, removePool } from "@/lib/pg-pools";

interface ConnectionRow {
  id: number;
  name: string;
  url: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conn = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as ConnectionRow | undefined;
    if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    removePool(conn.id);

    const pool = new Pool({ connectionString: conn.url });

    const client = await pool.connect();
    client.release();
    setPool(conn.id, pool);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
