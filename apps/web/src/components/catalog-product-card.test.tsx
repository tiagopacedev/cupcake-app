import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CatalogProductCard } from "./catalog-product-card";
import { selectQuantity, useCartStore } from "@/lib/cart-store";
import { makeProduct } from "@/test-utils/fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

import { toast } from "sonner";

const quantityInCart = () => selectQuantity("p1")(useCartStore.getState());
const product = (overrides = {}) =>
  makeProduct({ id: "p1", name: "Chocolate Crush", ...overrides });

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
  vi.clearAllMocks();
});

describe("US-05 add to cart from the card", () => {
  it("AC1: '+' adds one unit, shows the stepper with 1 and the toast with 'Ver carrinho'", () => {
    render(<CatalogProductCard product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Chocolate Crush" }));

    expect(quantityInCart()).toBe(1);
    expect(
      screen.getByRole("group", { name: "Quantidade de Chocolate Crush" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(toast).toHaveBeenCalledTimes(1);
    const [message, options] = vi.mocked(toast).mock.calls[0] ?? [];
    expect(message).toBe("Adicionado ao carrinho");
    expect(options?.action).toMatchObject({ label: "Ver carrinho" });
  });

  it("the toast action goes to the cart", () => {
    render(<CatalogProductCard product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Chocolate Crush" }));
    const options = vi.mocked(toast).mock.calls[0]?.[1];
    (options?.action as unknown as { onClick: () => void }).onClick();
    expect(push).toHaveBeenCalledWith("/cart");
  });

  it("AC2: '+' on the stepper raises the quantity without another toast", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 2 }] });
    render(<CatalogProductCard product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    expect(quantityInCart()).toBe(3);
    expect(toast).not.toHaveBeenCalled();
  });

  it("AC3: '−' at 1 removes the product and brings back the '+' button", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 1 }] });
    render(<CatalogProductCard product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "Diminuir" }));
    expect(quantityInCart()).toBe(0);
    expect(screen.getByRole("button", { name: "Adicionar Chocolate Crush" })).toBeInTheDocument();
  });

  it("'−' above 1 lowers the quantity by one", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 3 }] });
    render(<CatalogProductCard product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "Diminuir" }));
    expect(quantityInCart()).toBe(2);
  });

  it("offers no add control for a sold-out product (BR-04, US-04 AC1)", () => {
    render(
      <CatalogProductCard
        product={product({ stockQuantity: 0, stockState: "SOLD_OUT", maxQuantity: 0 })}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("US-06 client quantity limits", () => {
  it("AC2: at the stock limit '+' is disabled and 'Máximo disponível.' appears", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 3 }] });
    render(
      <CatalogProductCard
        product={product({ stockQuantity: 3, stockState: "LOW", maxQuantity: 3 })}
      />,
    );
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
    expect(screen.getAllByRole("status").map((el) => el.textContent)).toContain(
      "Máximo disponível.",
    );
  });

  it("AC1: the stepper stops at the available stock", () => {
    render(
      <CatalogProductCard
        product={product({ stockQuantity: 4, stockState: "LOW", maxQuantity: 4 })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Chocolate Crush" }));
    for (let i = 0; i < 6; i += 1) {
      const plus = screen.getByRole("button", { name: "Aumentar" });
      if (!(plus as HTMLButtonElement).disabled) fireEvent.click(plus);
    }
    expect(quantityInCart()).toBe(4);
  });

  it("AC3: with large stock the limit is 20", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 20 }] });
    render(<CatalogProductCard product={product({ stockQuantity: 50, maxQuantity: 20 })} />);
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  });

  it("US-06 AC5: at the cap of 20 the message points to the store for larger orders", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 20 }] });
    render(<CatalogProductCard product={product({ stockQuantity: 50, maxQuantity: 20 })} />);
    const messages = screen.getAllByRole("status").map((el) => el.textContent);
    expect(messages).toContain("Máximo de 20 unidades. Para encomendas maiores, fale com a loja.");
    expect(screen.queryByText("Máximo disponível.")).not.toBeInTheDocument();
  });

  it("US-06 AC5: when the stock is the limit it still says 'Máximo disponível.'", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 12 }] });
    render(
      <CatalogProductCard
        product={product({ stockQuantity: 12, stockState: "AVAILABLE", maxQuantity: 12 })}
      />,
    );
    expect(screen.getByText("Máximo disponível.")).toBeInTheDocument();
    expect(screen.queryByText(/fale com a loja/)).not.toBeInTheDocument();
  });

  it("shows no limit message below the limit", () => {
    useCartStore.setState({ lines: [{ productId: "p1", quantity: 1 }] });
    render(<CatalogProductCard product={product()} />);
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeEnabled();
    expect(screen.queryByText("Máximo disponível.")).not.toBeInTheDocument();
  });
});
