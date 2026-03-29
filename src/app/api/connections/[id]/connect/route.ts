import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import db from "@/lib/sqlite";
import { setPool, removePool, pools } from "@/lib/pg-pools";

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
    const connId = Number(id);
    const conn = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as ConnectionRow | undefined;
    if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    // Reuse existing pool if available
    if (pools.has(connId)) {
      return NextResponse.json({ ok: true });
    }

    const pool = new Pool({ connectionString: conn.url });

    const client = await pool.connect();
    client.release();
    setPool(connId, pool);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
