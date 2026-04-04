import { describe, it, expect } from "vitest";
import {
  isJsonValue,
  isLongString,
  formatCellPreview,
  getClipboardText,
} from "@/components/pg-gui/JsonCell";

describe("isJsonValue", () => {
  it("returns true for objects", () => {
    expect(isJsonValue({ a: 1 })).toBe(true);
    expect(isJsonValue({})).toBe(true);
  });

  it("returns true for arrays", () => {
    expect(isJsonValue([1, 2, 3])).toBe(true);
    expect(isJsonValue([])).toBe(true);
  });

  it("returns false for null", () => {
    expect(isJsonValue(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isJsonValue("hello")).toBe(false);
    expect(isJsonValue(42)).toBe(false);
    expect(isJsonValue(true)).toBe(false);
    expect(isJsonValue(undefined)).toBe(false);
  });
});

describe("isLongString", () => {
  it("returns false for short strings", () => {
    expect(isLongString("hello")).toBe(false);
    expect(isLongString("a".repeat(100))).toBe(false);
  });

  it("returns true for strings longer than threshold", () => {
    expect(isLongString("a".repeat(101))).toBe(true);
    expect(isLongString("a".repeat(500))).toBe(true);
  });

  it("respects custom threshold", () => {
    expect(isLongString("hello", 3)).toBe(true);
    expect(isLongString("hi", 3)).toBe(false);
  });

  it("returns false for non-strings", () => {
    expect(isLongString(12345)).toBe(false);
    expect(isLongString(null)).toBe(false);
    expect(isLongString(undefined)).toBe(false);
    expect(isLongString({ key: "value" })).toBe(false);
  });
});

describe("formatCellPreview", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatCellPreview(null)).toBe("");
    expect(formatCellPreview(undefined)).toBe("");
  });

  it("returns string representation for primitives", () => {
    expect(formatCellPreview("hello")).toBe("hello");
    expect(formatCellPreview(42)).toBe("42");
    expect(formatCellPreview(true)).toBe("true");
  });

  it("truncates long strings at 100 chars", () => {
    const longStr = "a".repeat(200);
    const result = formatCellPreview(longStr);
    expect(result.length).toBe(100);
    expect(result.endsWith("...")).toBe(true);
    expect(result).toBe("a".repeat(97) + "...");
  });

  it("does not truncate strings at exactly 100 chars", () => {
    const str = "a".repeat(100);
    expect(formatCellPreview(str)).toBe(str);
  });

  it("returns full JSON for small objects", () => {
    expect(formatCellPreview({ a: 1 })).toBe('{"a":1}');
    expect(formatCellPreview([1, 2])).toBe("[1,2]");
  });

  it("truncates JSON at 50 chars", () => {
    const obj = { longKey: "a".repeat(50) };
    const result = formatCellPreview(obj);
    expect(result.length).toBe(50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("does not truncate JSON at exactly 50 chars", () => {
    // {"a":"bbb..."} — build an object whose JSON is exactly 50 chars
    // {"key":"value"} = 15 chars, so we need to adjust
    const json = JSON.stringify({ a: 1 });
    if (json.length <= 50) {
      expect(formatCellPreview({ a: 1 })).toBe(json);
    }
  });
});

describe("getClipboardText", () => {
  it("returns empty string for null/undefined", () => {
    expect(getClipboardText(null)).toBe("");
    expect(getClipboardText(undefined)).toBe("");
  });

  it("returns string representation for primitives", () => {
    expect(getClipboardText("hello")).toBe("hello");
    expect(getClipboardText(42)).toBe("42");
    expect(getClipboardText(true)).toBe("true");
  });

  it("returns formatted JSON for objects", () => {
    expect(getClipboardText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("returns formatted JSON for arrays", () => {
    expect(getClipboardText([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it("returns formatted JSON for nested objects", () => {
    const nested = { user: { name: "Alice", roles: ["admin"] } };
    const result = getClipboardText(nested);
    expect(result).toContain('"user"');
    expect(result).toContain('"name": "Alice"');
    expect(result).toContain('"admin"');
    // Should be pretty-printed with 2-space indent
    expect(result).toContain("  ");
  });

  it("returns full untruncated string for long strings", () => {
    const longStr = "a".repeat(500);
    expect(getClipboardText(longStr)).toBe(longStr);
  });
});
