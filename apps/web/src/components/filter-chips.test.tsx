import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilterChips } from "./filter-chips";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("US-02 filter chips", () => {
  it("shows the five chips in order inside a labelled group", () => {
    render(<FilterChips selected={null} />);
    expect(screen.getByRole("group", { name: "Filtrar cupcakes" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Todos",
      "Mais vendidos",
      "Clássicos",
      "Chocolate",
      "Frutados",
    ]);
  });

  it("marks only the selected chip as pressed (Todos by default)", () => {
    const { rerender } = render(<FilterChips selected={null} />);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Chocolate" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(<FilterChips selected="chocolate" />);
    expect(screen.getByRole("button", { name: "Chocolate" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("adds no heading for the selected filter", () => {
    render(<FilterChips selected="chocolate" />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("updates the URL without scrolling, and Todos goes back to /", () => {
    render(<FilterChips selected="chocolate" />);
    fireEvent.click(screen.getByRole("button", { name: "Mais vendidos" }));
    expect(replace).toHaveBeenLastCalledWith("/?filter=bestsellers", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(replace).toHaveBeenLastCalledWith("/", { scroll: false });
  });

  it("US-02 AC5: sticks to the top of the screen with an opaque background", () => {
    render(<FilterChips selected={null} />);
    const row = screen.getByRole("group");
    expect(row).toHaveClass("sticky", "top-18", "lg:top-20", "bg-background");
    expect(row).toHaveClass("z-10");
  });

  it("hides the scrollbar and allows horizontal scroll on mobile (NFR-01)", () => {
    render(<FilterChips selected={null} />);
    const row = screen.getByRole("group");
    expect(row.className).toContain("overflow-x-auto");
    expect(row.className).toContain("[scrollbar-width:none]");
  });
});
