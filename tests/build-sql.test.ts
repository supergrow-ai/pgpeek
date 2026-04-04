import { describe, it, expect } from "vitest";
import { buildSQL } from "@/components/pg-gui/TableView";

describe("buildSQL", () => {
  describe("basic queries", () => {
    it("builds SELECT * with schema and table", () => {
      const sql = buildSQL("public", "users", null, [], 100, 0);
      expect(sql).toBe('SELECT *\nFROM "public"."users"\nLIMIT 100 OFFSET 0');
    });

    it("quotes schema and table names", () => {
      const sql = buildSQL("my schema", "my-table", null, [], 100, 0);
      expect(sql).toContain('"my schema"."my-table"');
    });

    it("includes LIMIT and OFFSET", () => {
      const sql = buildSQL("public", "users", null, [], 50, 200);
      expect(sql).toContain("LIMIT 50 OFFSET 200");
    });
  });

  describe("sorting", () => {
    it("adds ORDER BY ASC", () => {
      const sql = buildSQL("public", "users", { column: "name", direction: "ASC" }, [], 100, 0);
      expect(sql).toContain('ORDER BY "name" ASC');
    });

    it("adds ORDER BY DESC", () => {
      const sql = buildSQL("public", "users", { column: "created_at", direction: "DESC" }, [], 100, 0);
      expect(sql).toContain('ORDER BY "created_at" DESC');
    });

    it("ORDER BY comes before LIMIT", () => {
      const sql = buildSQL("public", "users", { column: "id", direction: "ASC" }, [], 100, 0);
      const orderIdx = sql.indexOf("ORDER BY");
      const limitIdx = sql.indexOf("LIMIT");
      expect(orderIdx).toBeLessThan(limitIdx);
    });

    it("no ORDER BY when sort is null", () => {
      const sql = buildSQL("public", "users", null, [], 100, 0);
      expect(sql).not.toContain("ORDER BY");
    });

    it("quotes column name in ORDER BY", () => {
      const sql = buildSQL("public", "users", { column: "impressions_count", direction: "DESC" }, [], 100, 0);
      expect(sql).toContain('"impressions_count"');
    });
  });

  describe("filtering", () => {
    it("adds WHERE clause for equals filter", () => {
      const filters = [{ column: "status", operator: "=", value: "active" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('WHERE "status" = \'active\'');
    });

    it("adds WHERE clause for not equals", () => {
      const filters = [{ column: "role", operator: "!=", value: "admin" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"role" != \'admin\'');
    });

    it("adds WHERE clause for greater than", () => {
      const filters = [{ column: "age", operator: ">", value: "18" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"age" > \'18\'');
    });

    it("adds WHERE clause for LIKE", () => {
      const filters = [{ column: "name", operator: "LIKE", value: "%alice%" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"name" LIKE \'%alice%\'');
    });

    it("adds WHERE clause for ILIKE", () => {
      const filters = [{ column: "email", operator: "ILIKE", value: "%@gmail.com" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"email" ILIKE \'%@gmail.com\'');
    });

    it("handles IS NULL without value", () => {
      const filters = [{ column: "deleted_at", operator: "IS NULL", value: "" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"deleted_at" IS NULL');
      expect(sql).not.toContain("''");
    });

    it("handles IS NOT NULL without value", () => {
      const filters = [{ column: "email", operator: "IS NOT NULL", value: "" }];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"email" IS NOT NULL');
    });

    it("joins multiple filters with AND", () => {
      const filters = [
        { column: "status", operator: "=", value: "active" },
        { column: "age", operator: ">", value: "18" },
      ];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain("WHERE");
      expect(sql).toContain("AND");
      expect(sql).toContain('"status" = \'active\'');
      expect(sql).toContain('"age" > \'18\'');
    });

    it("WHERE comes before ORDER BY", () => {
      const filters = [{ column: "status", operator: "=", value: "active" }];
      const sort = { column: "name", direction: "ASC" as const };
      const sql = buildSQL("public", "users", sort, filters, 100, 0);
      const whereIdx = sql.indexOf("WHERE");
      const orderIdx = sql.indexOf("ORDER BY");
      expect(whereIdx).toBeLessThan(orderIdx);
    });

    it("skips filters with empty column", () => {
      const filters = [
        { column: "status", operator: "=", value: "active" },
        { column: "", operator: "=", value: "ignored" },
      ];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain('"status" = \'active\'');
      expect(sql).not.toContain("ignored");
      expect(sql).not.toContain("AND");
    });

    it("skips filters with empty operator", () => {
      const filters = [
        { column: "status", operator: "", value: "active" },
      ];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).not.toContain("WHERE");
    });

    it("skips filters with empty value (non-null operators)", () => {
      const filters = [
        { column: "status", operator: "=", value: "" },
      ];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).not.toContain("WHERE");
    });

    it("keeps IS NULL filters even with empty value", () => {
      const filters = [
        { column: "email", operator: "IS NULL", value: "" },
      ];
      const sql = buildSQL("public", "users", null, filters, 100, 0);
      expect(sql).toContain("WHERE");
      expect(sql).toContain('"email" IS NULL');
    });
  });

  describe("combined queries", () => {
    it("builds complete query with filter, sort, limit, offset", () => {
      const filters = [{ column: "status", operator: "=", value: "published" }];
      const sort = { column: "impressions_count", direction: "DESC" as const };
      const sql = buildSQL("public", "posts", sort, filters, 50, 100);

      expect(sql).toContain('SELECT *');
      expect(sql).toContain('FROM "public"."posts"');
      expect(sql).toContain('WHERE "status" = \'published\'');
      expect(sql).toContain('ORDER BY "impressions_count" DESC');
      expect(sql).toContain("LIMIT 50 OFFSET 100");

      // Verify ordering of clauses
      const fromIdx = sql.indexOf("FROM");
      const whereIdx = sql.indexOf("WHERE");
      const orderIdx = sql.indexOf("ORDER BY");
      const limitIdx = sql.indexOf("LIMIT");
      expect(fromIdx).toBeLessThan(whereIdx);
      expect(whereIdx).toBeLessThan(orderIdx);
      expect(orderIdx).toBeLessThan(limitIdx);
    });

    it("builds query with multiple filters and sort", () => {
      const filters = [
        { column: "status", operator: "=", value: "active" },
        { column: "role", operator: "!=", value: "banned" },
        { column: "email", operator: "IS NOT NULL", value: "" },
      ];
      const sort = { column: "created_at", direction: "DESC" as const };
      const sql = buildSQL("analytics", "users", sort, filters, 25, 0);

      expect(sql).toContain('FROM "analytics"."users"');
      expect(sql).toContain('"status" = \'active\'');
      expect(sql).toContain('"role" != \'banned\'');
      expect(sql).toContain('"email" IS NOT NULL');
      expect(sql).toContain('ORDER BY "created_at" DESC');
      expect(sql).toContain("LIMIT 25 OFFSET 0");
    });

    it("query with sort but no filters has no WHERE", () => {
      const sql = buildSQL("public", "logs", { column: "ts", direction: "DESC" }, [], 500, 0);
      expect(sql).not.toContain("WHERE");
      expect(sql).toContain("ORDER BY");
    });

    it("query with filters but no sort has no ORDER BY", () => {
      const filters = [{ column: "level", operator: "=", value: "error" }];
      const sql = buildSQL("public", "logs", null, filters, 100, 0);
      expect(sql).toContain("WHERE");
      expect(sql).not.toContain("ORDER BY");
    });
  });
});
