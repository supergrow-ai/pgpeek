import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/pg-pools";

const VALID_OPERATORS = ["=", "!=", ">", "<", ">=", "<=", "LIKE", "ILIKE", "IS NULL", "IS NOT NULL"];
const VALID_DIRECTIONS = ["ASC", "DESC"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; schema: string; table: string }> }
) {
  try {
    const { id, schema, table } = await params;
    const pool = getPool(Number(id));
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100") || 100, 1), 1000);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);
    const sortCol = url.searchParams.get("sortCol");
    const sortDir = url.searchParams.get("sortDir") || "ASC";
    const filtersJson = url.searchParams.get("filters");

    // Build WHERE clause from filters
    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];
    let paramIndex = 1;

    if (filtersJson) {
      try {
        const filters = JSON.parse(filtersJson) as Array<{
          column: string;
          operator: string;
          value: string;
        }>;
        for (const f of filters) {
          if (!VALID_OPERATORS.includes(f.operator)) continue;
          if (f.operator === "IS NULL") {
            whereClauses.push(`"${f.column}" IS NULL`);
          } else if (f.operator === "IS NOT NULL") {
            whereClauses.push(`"${f.column}" IS NOT NULL`);
          } else {
            whereClauses.push(`"${f.column}" ${f.operator} $${paramIndex}`);
            whereParams.push(f.value);
            paramIndex++;
          }
        }
      } catch {
        // ignore bad JSON
      }
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Build ORDER BY
    let orderSQL = "";
    if (sortCol) {
      const dir = VALID_DIRECTIONS.includes(sortDir.toUpperCase()) ? sortDir.toUpperCase() : "ASC";
      orderSQL = `ORDER BY "${sortCol}" ${dir}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM "${schema}"."${table}" ${whereSQL}`,
      whereParams
    );

    const dataResult = await pool.query(
      `SELECT * FROM "${schema}"."${table}" ${whereSQL} ${orderSQL} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...whereParams, limit, offset]
    );

    // Resolve pg type names so the client can pick type-aware editors
    // (e.g. a true/false picker for boolean columns).
    const typeIds = [...new Set(dataResult.fields.map((f) => f.dataTypeID))];
    const typeNames = new Map<number, string>();
    if (typeIds.length > 0) {
      const typeResult = await pool.query(
        `SELECT oid, typname FROM pg_type WHERE oid = ANY($1::oid[])`,
        [typeIds]
      );
      for (const r of typeResult.rows as Array<{ oid: number | string; typname: string }>) {
        typeNames.set(Number(r.oid), r.typname);
      }
    }

    return NextResponse.json({
      rows: dataResult.rows,
      fields: dataResult.fields.map((f) => f.name),
      fieldTypes: dataResult.fields.map((f) => typeNames.get(f.dataTypeID) ?? "unknown"),
      total: parseInt(countResult.rows[0].total),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
