// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "@/components/pg-gui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog open={false} title="Delete row?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.queryByText("Delete row?")).not.toBeInTheDocument();
  });

  it("shows title and description and calls onConfirm / onCancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete 2 rows?"
        description="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText("Delete 2 rows?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while loading", () => {
    render(
      <ConfirmDialog open loading title="Delete row?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Deleting...")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});
