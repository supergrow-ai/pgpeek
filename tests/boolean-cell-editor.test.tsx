// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BooleanCellEditor, {
  parseBooleanOption,
  toBooleanOption,
  NULL_OPTION,
} from "@/components/pg-gui/BooleanCellEditor";
import type { CustomCellEditorProps } from "ag-grid-react";

function renderEditor(value: unknown) {
  const onValueChange = vi.fn();
  const stopEditing = vi.fn();
  render(
    <BooleanCellEditor
      {...({ value, onValueChange, stopEditing } as unknown as CustomCellEditorProps)}
    />
  );
  return { onValueChange, stopEditing };
}

describe("BooleanCellEditor helpers", () => {
  it("maps values to select options", () => {
    expect(toBooleanOption(true)).toBe("true");
    expect(toBooleanOption(false)).toBe("false");
    expect(toBooleanOption("t")).toBe("true");
    expect(toBooleanOption("false")).toBe("false");
    expect(toBooleanOption(null)).toBe(NULL_OPTION);
    expect(toBooleanOption(undefined)).toBe(NULL_OPTION);
  });

  it("parses options back to real booleans or null", () => {
    expect(parseBooleanOption("true")).toBe(true);
    expect(parseBooleanOption("false")).toBe(false);
    expect(parseBooleanOption(NULL_OPTION)).toBeNull();
  });
});

describe("BooleanCellEditor", () => {
  it("shows the current value and focuses the select", () => {
    renderEditor(true);
    const select = screen.getByLabelText("Boolean value") as HTMLSelectElement;
    expect(select.value).toBe("true");
    expect(select).toHaveFocus();
  });

  it("commits a real boolean (not a string) and stops editing", () => {
    const { onValueChange, stopEditing } = renderEditor(true);
    fireEvent.change(screen.getByLabelText("Boolean value"), {
      target: { value: "false" },
    });
    expect(onValueChange).toHaveBeenCalledWith(false);
    expect(onValueChange).not.toHaveBeenCalledWith("false");
    expect(stopEditing).toHaveBeenCalled();
  });

  it("can set the cell to NULL", () => {
    const { onValueChange } = renderEditor(false);
    fireEvent.change(screen.getByLabelText("Boolean value"), {
      target: { value: NULL_OPTION },
    });
    expect(onValueChange).toHaveBeenCalledWith(null);
  });
});
