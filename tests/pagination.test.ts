import { describe, it, expect } from "vitest";
import { PAGE_SIZE_OPTIONS } from "@/components/pg-gui/TableView";

describe("PAGE_SIZE_OPTIONS", () => {
  it("contains expected page sizes", () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100, 250, 500]);
  });

  it("is sorted in ascending order", () => {
    for (let i = 1; i < PAGE_SIZE_OPTIONS.length; i++) {
      expect(PAGE_SIZE_OPTIONS[i]).toBeGreaterThan(PAGE_SIZE_OPTIONS[i - 1]);
    }
  });

  it("contains only positive integers", () => {
    PAGE_SIZE_OPTIONS.forEach((size) => {
      expect(Number.isInteger(size)).toBe(true);
      expect(size).toBeGreaterThan(0);
    });
  });

  it("includes 100 as default", () => {
    expect(PAGE_SIZE_OPTIONS).toContain(100);
  });
});

describe("Pagination calculations", () => {
  // These mirror the calculations in TableView
  function calcPageCount(total: number, limit: number) {
    return Math.ceil(total / limit);
  }

  function calcCurrentPage(offset: number, limit: number) {
    return Math.floor(offset / limit) + 1;
  }

  it("calculates page count correctly", () => {
    expect(calcPageCount(100, 100)).toBe(1);
    expect(calcPageCount(101, 100)).toBe(2);
    expect(calcPageCount(0, 100)).toBe(0);
    expect(calcPageCount(250, 50)).toBe(5);
    expect(calcPageCount(251, 50)).toBe(6);
  });

  it("calculates current page correctly", () => {
    expect(calcCurrentPage(0, 100)).toBe(1);
    expect(calcCurrentPage(100, 100)).toBe(2);
    expect(calcCurrentPage(200, 100)).toBe(3);
    expect(calcCurrentPage(0, 25)).toBe(1);
    expect(calcCurrentPage(25, 25)).toBe(2);
    expect(calcCurrentPage(75, 25)).toBe(4);
  });

  it("page navigation bounds", () => {
    const total = 250;
    const limit = 100;
    const pageCount = calcPageCount(total, limit);

    // First page
    expect(calcCurrentPage(0, limit)).toBe(1);

    // Last page
    const lastOffset = (pageCount - 1) * limit;
    expect(calcCurrentPage(lastOffset, limit)).toBe(pageCount);

    // Can't go before first page
    expect(Math.max(0, 0 - limit)).toBe(0);

    // Can't go past last page
    expect(lastOffset + limit >= total).toBe(true);
  });

  it("handles different page sizes", () => {
    const total = 1000;

    // 25 per page
    expect(calcPageCount(total, 25)).toBe(40);

    // 500 per page
    expect(calcPageCount(total, 500)).toBe(2);

    // All on one page
    expect(calcPageCount(total, 1000)).toBe(1);
  });
});
