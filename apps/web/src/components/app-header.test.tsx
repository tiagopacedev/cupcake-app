import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { AppHeader } from "./app-header";
import { CartLink } from "./cart-link";
import { StoreFooter } from "./store-footer";
import { useCartStore } from "@/lib/cart-store";

beforeEach(() => useCartStore.setState({ lines: [], hydrated: true }));

describe("US-07 cart badge in the catalog header", () => {
  it("shows total units, not distinct products (AC1)", () => {
    useCartStore.setState({
      lines: [
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 3 },
      ],
    });
    render(<AppHeader variant="catalog" />);
    const cart = screen.getByRole("link", { name: "Carrinho, 5 itens" });
    expect(cart).toHaveAttribute("href", "/cart");
    expect(cart).toHaveTextContent("Carrinho5");
  });

  it("shows no number when the cart is empty (AC2)", () => {
    render(<AppHeader variant="catalog" />);
    const cart = screen.getByRole("link", { name: "Carrinho" });
    expect(cart).not.toHaveTextContent(/\d/);
  });

  it("updates immediately when the cart changes", () => {
    render(<AppHeader variant="catalog" />);
    act(() => useCartStore.getState().add("a", 5));
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument();
  });
});

describe("CartLink labels", () => {
  it("uses the plain label at 0 and the plural from 2 units", () => {
    const { rerender } = render(<CartLink count={0} />);
    expect(screen.getByRole("link", { name: "Carrinho" })).toBeInTheDocument();
    rerender(<CartLink count={2} />);
    expect(screen.getByRole("link", { name: "Carrinho, 2 itens" })).toBeInTheDocument();
  });
});

describe("inner header (04-ui-design-system.md §6.1)", () => {
  it("shows a back link and the page title as h1", () => {
    render(<AppHeader variant="inner" title="Carrinho" backHref="/" />);
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1, name: "Carrinho" })).toBeInTheDocument();
  });

  it("accepts a custom back label", () => {
    render(
      <AppHeader variant="inner" title="Meu pedido" backHref="/" backLabel="Voltar ao início" />,
    );
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toBeInTheDocument();
  });

  it("has no history or account control", () => {
    render(<AppHeader variant="inner" title="Carrinho" backHref="/" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("store footer", () => {
  it("shows the store name, address and opening hours from the shared config", () => {
    render(<StoreFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Cupcake Store");
    expect(footer).toHaveTextContent("Rua das Flores, 123 · Centro · São Paulo, SP");
    expect(footer).toHaveTextContent("Ter a dom, 10h às 19h");
  });
});
