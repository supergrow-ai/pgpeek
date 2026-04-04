// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock AG Grid since it doesn't render in jsdom
vi.mock("ag-grid-react", () => ({
  AgGridReact: ({ rowData, columnDefs }: { rowData: unknown[]; columnDefs: { field: string }[] }) => (
    <div data-testid="ag-grid">
      <span data-testid="ag-grid-rows">{rowData?.length ?? 0}</span>
      <span data-testid="ag-grid-cols">{columnDefs?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock("ag-grid-community", () => ({
  AllCommunityModule: {},
  ModuleRegistry: { registerModules: vi.fn() },
  colorSchemeLight: {},
  themeQuartz: { withPart: () => ({ withParams: () => ({}) }) },
}));

import QueryEditor from "@/components/pg-gui/QueryEditor";
import { api } from "@/lib/api";

// Mock the API
vi.mock("@/lib/api", () => ({
  api: {
    runQuery: vi.fn(),
    saveQuery: vi.fn(),
    updateSavedQuery: vi.fn(),
  },
}));

const mockConnection = { id: 1, name: "Test", url: "", selected_schema: "public" };

describe("QueryEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SQL input and Run button", () => {
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={false} />
    );
    expect(screen.getByPlaceholderText("SELECT * FROM ...")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();
  });

  it("renders with initial query", () => {
    render(
      <QueryEditor
        connection={mockConnection}
        initialQuery="SELECT * FROM users"
        readOnly={false}
        noSchemaChanges={false}
      />
    );
    expect(screen.getByDisplayValue("SELECT * FROM users")).toBeInTheDocument();
  });

  it("shows Save button", () => {
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={false} />
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("blocks write queries in read-only mode", async () => {
    const user = userEvent.setup();
    render(
      <QueryEditor connection={mockConnection} readOnly={true} noSchemaChanges={false} />
    );
    const textarea = screen.getByPlaceholderText("SELECT * FROM ...");
    await user.clear(textarea);
    await user.type(textarea, "INSERT INTO users VALUES (1)");
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByText(/Read-only mode/)).toBeInTheDocument();
    });
    expect(api.runQuery).not.toHaveBeenCalled();
  });

  it("blocks DDL queries when noSchemaChanges is on", async () => {
    const user = userEvent.setup();
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={true} />
    );
    const textarea = screen.getByPlaceholderText("SELECT * FROM ...");
    await user.clear(textarea);
    await user.type(textarea, "DROP TABLE users");
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByText(/Schema changes/)).toBeInTheDocument();
    });
    expect(api.runQuery).not.toHaveBeenCalled();
  });

  it("renders AG Grid for query results with rows", async () => {
    vi.mocked(api.runQuery).mockResolvedValue({
      rows: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
      fields: ["id", "name"],
      rowCount: 2,
      duration: 5,
    });

    const user = userEvent.setup();
    render(
      <QueryEditor
        connection={mockConnection}
        initialQuery="SELECT * FROM users"
        readOnly={false}
        noSchemaChanges={false}
      />
    );
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByTestId("ag-grid")).toBeInTheDocument();
    });
    expect(screen.getByTestId("ag-grid-rows")).toHaveTextContent("2");
    expect(screen.getByTestId("ag-grid-cols")).toHaveTextContent("2");
  });

  it("shows execution stats after query runs", async () => {
    vi.mocked(api.runQuery).mockResolvedValue({
      rows: [{ id: 1 }],
      fields: ["id"],
      rowCount: 1,
      duration: 42,
    });

    render(
      <QueryEditor
        connection={mockConnection}
        initialQuery="SELECT 1"
        readOnly={false}
        noSchemaChanges={false}
      />
    );
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByText("42ms")).toBeInTheDocument();
      expect(screen.getByText("1 rows")).toBeInTheDocument();
    });
  });

  it("shows rows-affected message for non-SELECT queries", async () => {
    vi.mocked(api.runQuery).mockResolvedValue({
      rows: [],
      fields: [],
      rowCount: 5,
      duration: 10,
    });

    render(
      <QueryEditor
        connection={mockConnection}
        initialQuery="UPDATE users SET name = 'test'"
        readOnly={false}
        noSchemaChanges={false}
      />
    );
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByText(/5 rows affected/)).toBeInTheDocument();
    });
  });

  it("shows error message when query fails", async () => {
    vi.mocked(api.runQuery).mockRejectedValue(new Error("relation \"users\" does not exist"));

    render(
      <QueryEditor
        connection={mockConnection}
        initialQuery="SELECT * FROM users"
        readOnly={false}
        noSchemaChanges={false}
      />
    );
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(screen.getByText(/relation "users" does not exist/)).toBeInTheDocument();
    });
  });

  it("does not run empty queries", () => {
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={false} />
    );
    fireEvent.click(screen.getByText("Run"));
    expect(api.runQuery).not.toHaveBeenCalled();
  });

  it("shows save name input when Save is clicked", async () => {
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={false} />
    );
    fireEvent.click(screen.getByText("Save"));

    expect(screen.getByPlaceholderText("Query name")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("hides save input when Cancel is clicked", async () => {
    render(
      <QueryEditor connection={mockConnection} readOnly={false} noSchemaChanges={false} />
    );
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByPlaceholderText("Query name")).not.toBeInTheDocument();
  });
});
