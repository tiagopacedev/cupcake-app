import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("E1-03 placeholder home page", () => {
  it("renders the Cupcake Store wordmark", () => {
    render(<HomePage />);
    expect(screen.getByText("Cupcake Store")).toBeInTheDocument();
  });
});
