import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./app-header";
import { StoreFooter } from "./store-footer";

describe("US-07 catalog header cart button", () => {
  it("hides the count at 0 and labels the link plainly", () => {
    render(<AppHeader variant="catalog" cartCount={0} />);
    const cart = screen.getByRole("link", { name: "Carrinho" });
    expect(cart).toHaveAttribute("href", "/cart");
    expect(cart).not.toHaveTextContent(/\d/);
  });

  it("shows the unit count and an accessible label when there are items", () => {
    render(<AppHeader variant="catalog" cartCount={4} />);
    const cart = screen.getByRole("link", { name: "Carrinho, 4 itens" });
    expect(cart).toHaveTextContent("Carrinho4");
  });

  it("uses the singular for one item", () => {
    render(<AppHeader variant="catalog" cartCount={1} />);
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument();
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
