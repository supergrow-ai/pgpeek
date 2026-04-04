// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InsertRowPanel from "@/components/pg-gui/InsertRowPanel";

describe("InsertRowPanel", () => {
  const fields = ["id", "name", "email", "age"];
  let onInsert: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onInsert = vi.fn().mockResolvedValue(undefined);
    onClose = vi.fn();
  });

  it("renders all field labels", () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    for (const field of fields) {
      expect(screen.getByText(field)).toBeInTheDocument();
    }
  });

  it("renders Insert Row and Cancel buttons", () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    expect(screen.getByText("Insert Row")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("all fields start as NULL", () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    // All inputs should be disabled (NULL mode)
    const inputs = screen.getAllByPlaceholderText("NULL");
    expect(inputs.length).toBe(fields.length);
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("inserts all nulls when no values are entered", async () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith({
        id: null,
        name: null,
        email: null,
        age: null,
      });
    });
  });

  it("toggling NULL off enables input", async () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    // Each field has a NULL toggle button
    const nullButtons = screen.getAllByText("NULL");
    // Click the first NULL button to toggle it off for "id"
    fireEvent.click(nullButtons[0]);

    // The id input should now be enabled with placeholder "Enter value..."
    const enabledInput = screen.getByPlaceholderText("Enter value...");
    expect(enabledInput).not.toBeDisabled();
  });

  it("typing in a field un-nulls it automatically", async () => {
    const user = userEvent.setup();
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );

    // Toggle NULL off for name field first
    const nullButtons = screen.getAllByText("NULL");
    await user.click(nullButtons[1]); // "name" is second field

    // Type a value
    const input = screen.getByPlaceholderText("Enter value...");
    await user.type(input, "Alice");

    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Alice" })
      );
    });
  });

  it("toggling NULL back on after typing clears the value in submission", async () => {
    const user = userEvent.setup();
    render(
      <InsertRowPanel
        fields={["name"]}
        onInsert={onInsert}
        onClose={onClose}
      />
    );

    // Toggle NULL off
    const nullBtn = screen.getByText("NULL");
    await user.click(nullBtn);

    // Type a value
    const input = screen.getByPlaceholderText("Enter value...");
    await user.type(input, "Alice");

    // Toggle NULL back on
    await user.click(nullBtn);

    // Submit
    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith({ name: null });
    });
  });

  it("Cancel calls onClose", () => {
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error message when insert fails", async () => {
    onInsert.mockRejectedValue(new Error("Duplicate key violation"));
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );

    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(screen.getByText("Duplicate key violation")).toBeInTheDocument();
    });
  });

  it("shows generic error for non-Error rejects", async () => {
    onInsert.mockRejectedValue("something went wrong");
    render(
      <InsertRowPanel fields={fields} onInsert={onInsert} onClose={onClose} />
    );

    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(screen.getByText("Insert failed")).toBeInTheDocument();
    });
  });

  it("renders correctly with a single field", () => {
    render(
      <InsertRowPanel
        fields={["status"]}
        onInsert={onInsert}
        onClose={onClose}
      />
    );
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("NULL")).toHaveLength(1);
  });

  it("renders correctly with many fields", () => {
    const manyFields = Array.from({ length: 20 }, (_, i) => `field_${i}`);
    render(
      <InsertRowPanel
        fields={manyFields}
        onInsert={onInsert}
        onClose={onClose}
      />
    );
    for (const field of manyFields) {
      expect(screen.getByText(field)).toBeInTheDocument();
    }
  });

  it("submits mixed null and non-null values correctly", async () => {
    const user = userEvent.setup();
    render(
      <InsertRowPanel
        fields={["id", "name", "email"]}
        onInsert={onInsert}
        onClose={onClose}
      />
    );

    // Toggle NULL off for "name" (2nd field) and type a value
    const nullButtons = screen.getAllByText("NULL");
    await user.click(nullButtons[1]); // name
    const nameInput = screen.getByPlaceholderText("Enter value...");
    await user.type(nameInput, "Bob");

    // Toggle NULL off for "email" (3rd field) and type a value
    await user.click(nullButtons[2]); // email
    const inputs = screen.getAllByPlaceholderText("Enter value...");
    await user.type(inputs[1], "bob@test.com");

    // Submit — id should be null, name and email should have values
    fireEvent.click(screen.getByText("Insert Row"));

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith({
        id: null,
        name: "Bob",
        email: "bob@test.com",
      });
    });
  });
});
