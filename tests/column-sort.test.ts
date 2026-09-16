import { describe, it, expect } from "vitest";
import { sortFromColumnState } from "@/components/pg-gui/TableView";

describe("sortFromColumnState", () => {
  it("returns null when no column is sorted", () => {
    expect(
      sortFromColumnState([
        { colId: "id", sort: null },
        { colId: "name", sort: null },
      ])
    ).toBeNull();
  });

  it("maps a single sorted column to a server sort config", () => {
    expect(
      sortFromColumnState([
        { colId: "id", sort: null },
        { colId: "created_at", sort: "desc", sortIndex: 0 },
      ])
    ).toEqual({ column: "created_at", direction: "DESC" });
    expect(
      sortFromColumnState([{ colId: "name", sort: "asc", sortIndex: 0 }])
    ).toEqual({ column: "name", direction: "ASC" });
  });

  it("uses the most recently sorted column when several are sorted", () => {
    expect(
      sortFromColumnState([
        { colId: "id", sort: "asc", sortIndex: 0 },
        { colId: "email", sort: "desc", sortIndex: 1 },
      ])
    ).toEqual({ column: "email", direction: "DESC" });
  });
});
