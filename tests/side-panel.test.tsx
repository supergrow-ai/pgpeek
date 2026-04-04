// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SidePanel from "@/components/pg-gui/SidePanel";

describe("SidePanel", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <SidePanel open={false} title="Test" onClose={vi.fn()}>
        <p>Content</p>
      </SidePanel>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and children when open", () => {
    render(
      <SidePanel open={true} title="Details" onClose={vi.fn()}>
        <p>Hello World</p>
      </SidePanel>
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} title="Panel" onClose={onClose}>
        <p>Content</p>
      </SidePanel>
    );
    // The close button has an X icon — find it by role
    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} title="Panel" onClose={onClose}>
        <p>Content</p>
      </SidePanel>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on other keys", () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} title="Panel" onClose={onClose}>
        <p>Content</p>
      </SidePanel>
    );
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies custom width", () => {
    render(
      <SidePanel open={true} title="Wide" onClose={vi.fn()} width={600}>
        <p>Wide panel</p>
      </SidePanel>
    );
    const panel = screen.getByText("Wide").closest("div[style]");
    expect(panel).toHaveStyle({ width: "600px" });
  });

  it("uses default width of 400px", () => {
    render(
      <SidePanel open={true} title="Default" onClose={vi.fn()}>
        <p>Default width</p>
      </SidePanel>
    );
    const panel = screen.getByText("Default").closest("div[style]");
    expect(panel).toHaveStyle({ width: "400px" });
  });

  it("truncates long titles", () => {
    const longTitle = "A".repeat(200);
    render(
      <SidePanel open={true} title={longTitle} onClose={vi.fn()}>
        <p>Content</p>
      </SidePanel>
    );
    const titleEl = screen.getByText(longTitle);
    expect(titleEl.className).toContain("truncate");
  });
});
