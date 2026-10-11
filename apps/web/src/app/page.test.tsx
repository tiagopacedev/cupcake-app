import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { makeProduct } from "@/test-utils/fixtures";

vi.mock("@/lib/catalog", () => ({ fetchProducts: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { fetchProducts } from "@/lib/catalog";

describe("SCR-01 catalog page (US-01)", () => {
  it("renders the header, one card per product in API order, and the footer", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([
      makeProduct({ id: "a", name: "Birthday Vanilla" }),
      makeProduct({ id: "b", name: "Red Velvet Classic" }),
    ]);
    render(await HomePage());

    expect(screen.getByRole("link", { name: "Cupcake Store" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Carrinho" })).toHaveAttribute("href", "/cart");
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Birthday Vanilla", "Red Velvet Classic"]);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Rua das Flores, 123");
  });

  it("shows the failure state with a retry button when the API is unreachable", async () => {
    vi.mocked(fetchProducts).mockResolvedValue(null);
    render(await HomePage());

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.getByText("Verifique sua conexão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    // The header stays so the customer can still reach the cart.
    expect(screen.getByRole("link", { name: "Carrinho" })).toBeInTheDocument();
  });
});
