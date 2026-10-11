import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("SCR-01 home page shell (E5-01)", () => {
  it("renders the header wordmark, the cart link and the store footer", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Cupcake Store" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Carrinho" })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Rua das Flores, 123");
  });
});
