import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { bestsellerTag, makeProduct } from "@/test-utils/fixtures";

vi.mock("@/lib/catalog", () => ({ fetchProducts: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

import { fetchProducts } from "@/lib/catalog";

const renderPage = async (filter?: string) =>
  render(await HomePage({ searchParams: Promise.resolve({ filter }) }));

beforeEach(() => vi.mocked(fetchProducts).mockReset());

describe("SCR-01 catalog page (US-01)", () => {
  it("renders the header, one card per product in API order, and the footer", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([
      makeProduct({ id: "a", name: "Birthday Vanilla" }),
      makeProduct({ id: "b", name: "Red Velvet Classic" }),
    ]);
    await renderPage();

    expect(screen.getByRole("link", { name: "Cupcake Store" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Carrinho" })).toHaveAttribute("href", "/cart");
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Birthday Vanilla", "Red Velvet Classic"]);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Rua das Flores, 123");
  });

  it("shows the failure state with a retry button when the API is unreachable", async () => {
    vi.mocked(fetchProducts).mockResolvedValue(null);
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.getByText("Verifique sua conexão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    // The header stays so the customer can still reach the cart.
    expect(screen.getByRole("link", { name: "Carrinho" })).toBeInTheDocument();
  });
});

describe("US-02 / US-03 filters from the URL", () => {
  it("shows Todos selected and requests everything without a filter", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([makeProduct()]);
    await renderPage();
    expect(fetchProducts).toHaveBeenCalledWith({});
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("applies ?filter=chocolate as category=chocolate and highlights the chip (AC1, AC4)", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([makeProduct()]);
    await renderPage("chocolate");
    expect(fetchProducts).toHaveBeenCalledWith({ category: "chocolate" });
    expect(screen.getByRole("button", { name: "Chocolate" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("applies ?filter=bestsellers as tag=bestseller and shows the badge (US-03 AC1, AC2)", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([makeProduct({ tags: [bestsellerTag] })]);
    await renderPage("bestsellers");
    expect(fetchProducts).toHaveBeenCalledWith({ tag: "bestseller" });
    expect(screen.getByText("Mais vendido")).toBeInTheDocument();
  });

  it("falls back to Todos for an unknown filter value", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([makeProduct()]);
    await renderPage("desserts");
    expect(fetchProducts).toHaveBeenCalledWith({});
  });

  it("shows the empty state with a way back to all cupcakes (AC3)", async () => {
    vi.mocked(fetchProducts).mockResolvedValue([]);
    await renderPage("fruity");
    expect(
      screen.getByRole("heading", { level: 2, name: "Nenhum cupcake aqui" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Veja todos os sabores.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/");
  });
});
