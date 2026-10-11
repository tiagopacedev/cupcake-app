import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CartView } from "./cart-view";
import { useCartStore } from "@/lib/cart-store";
import { makeProduct } from "@/test-utils/fixtures";

vi.mock("@/lib/api/client", () => ({ api: { GET: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { api } from "@/lib/api/client";

const crush = makeProduct({
  id: "crush",
  name: "Chocolate Crush",
  priceCents: 1190,
  stockQuantity: 35,
  maxQuantity: 20,
});
const kiss = makeProduct({
  id: "kiss",
  name: "Strawberry Kiss",
  priceCents: 1190,
  stockQuantity: 30,
  maxQuantity: 20,
});
const cookies = makeProduct({
  id: "cookies",
  name: "Cookies & Cream",
  priceCents: 1290,
  stockQuantity: 3,
  stockState: "LOW",
  maxQuantity: 3,
});

const serve = (products: unknown[]) =>
  vi.mocked(api.GET).mockResolvedValue({ data: { products } } as never);
const setCart = (lines: { productId: string; quantity: number }[]) =>
  useCartStore.setState({ lines, hydrated: true });
const money = (cents: string) => new RegExp(`^R\\$\\s${cents}$`);

beforeEach(() => {
  vi.mocked(api.GET).mockReset();
  useCartStore.setState({ lines: [], hydrated: true });
});

describe("US-08 review the cart and total", () => {
  it("AC1: shows each line with name, unit price, stepper, line subtotal, then the totals", async () => {
    serve([crush, kiss]);
    setCart([
      { productId: "crush", quantity: 2 },
      { productId: "kiss", quantity: 1 },
    ]);
    render(<CartView />);

    const crushRow = (await screen.findByRole("heading", { name: "Chocolate Crush" })).closest(
      "li",
    );
    expect(crushRow).not.toBeNull();
    const row = within(crushRow as HTMLElement);
    expect(row.getByText(money("11,90"))).toBeInTheDocument(); // unit price
    expect(row.getByText(money("23,80"))).toBeInTheDocument(); // line subtotal
    expect(row.getByRole("group", { name: "Quantidade de Chocolate Crush" })).toBeInTheDocument();

    expect(screen.getByText("Subtotal (3 itens)")).toBeInTheDocument();
    expect(screen.getByText("Retirada na loja")).toBeInTheDocument();
    expect(screen.getByText("Grátis")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText(money("35,70"))).toHaveLength(2); // subtotal and total
  });

  it("AC2: an empty cart shows the empty state and no way to continue", async () => {
    render(<CartView />);
    expect(await screen.findByRole("heading", { name: "Carrinho vazio" })).toBeInTheDocument();
    expect(screen.getByText("Escolha seus cupcakes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver cupcakes" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Continuar" })).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it("AC3: 'Continuar' goes to the checkout", async () => {
    serve([crush]);
    setCart([{ productId: "crush", quantity: 1 }]);
    render(<CartView />);
    expect(await screen.findByRole("link", { name: "Continuar" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("AC4: shows the current price from the server, not a stored one", async () => {
    serve([{ ...crush, priceCents: 1500 }]);
    setCart([{ productId: "crush", quantity: 2 }]);
    render(<CartView />);
    expect((await screen.findAllByText(money("30,00"))).length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(useCartStore.getState().lines)).not.toMatch(/1190|1500/);
  });

  it("singular 'item' for one unit", async () => {
    serve([crush]);
    setCart([{ productId: "crush", quantity: 1 }]);
    render(<CartView />);
    expect(await screen.findByText("Subtotal (1 item)")).toBeInTheDocument();
  });
});

describe("US-09 edit cart items", () => {
  it("AC1: the stepper updates the line subtotal and the total immediately, up to the limit", async () => {
    serve([cookies]);
    setCart([{ productId: "cookies", quantity: 2 }]);
    render(<CartView />);

    await screen.findByRole("heading", { name: "Cookies & Cream" });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    expect(useCartStore.getState().lines).toEqual([{ productId: "cookies", quantity: 3 }]);
    expect(screen.getAllByText(money("38,70")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled(); // stock is 3

    fireEvent.click(screen.getByRole("button", { name: "Diminuir" }));
    expect(useCartStore.getState().lines).toEqual([{ productId: "cookies", quantity: 2 }]);
    expect(screen.getAllByText(money("25,80")).length).toBeGreaterThanOrEqual(2);
  });

  it("disables 'Diminuir' at 1: removal has its own button", async () => {
    serve([crush]);
    setCart([{ productId: "crush", quantity: 1 }]);
    render(<CartView />);
    await screen.findByRole("heading", { name: "Chocolate Crush" });
    expect(screen.getByRole("button", { name: "Diminuir" })).toBeDisabled();
  });

  it("AC2: remove asks for confirmation, then the item disappears and totals update", async () => {
    serve([crush, kiss]);
    setCart([
      { productId: "crush", quantity: 2 },
      { productId: "kiss", quantity: 1 },
    ]);
    render(<CartView />);
    await screen.findByRole("heading", { name: "Chocolate Crush" });

    fireEvent.click(screen.getByRole("button", { name: "Remover Chocolate Crush" }));
    expect(screen.getByText("Remover Chocolate Crush?")).toBeInTheDocument();
    expect(useCartStore.getState().lines).toHaveLength(2); // nothing removed yet

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.queryByRole("heading", { name: "Chocolate Crush" })).not.toBeInTheDocument();
    expect(useCartStore.getState().lines).toEqual([{ productId: "kiss", quantity: 1 }]);
    expect(screen.getByText("Subtotal (1 item)")).toBeInTheDocument();
  });

  it("AC3: cancelling keeps the item unchanged", async () => {
    serve([crush]);
    setCart([{ productId: "crush", quantity: 2 }]);
    render(<CartView />);
    await screen.findByRole("heading", { name: "Chocolate Crush" });

    fireEvent.click(screen.getByRole("button", { name: "Remover Chocolate Crush" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Remover Chocolate Crush?")).not.toBeInTheDocument();
    expect(useCartStore.getState().lines).toEqual([{ productId: "crush", quantity: 2 }]);
  });

  it("removing the last item shows the empty state", async () => {
    serve([crush]);
    setCart([{ productId: "crush", quantity: 1 }]);
    render(<CartView />);
    await screen.findByRole("heading", { name: "Chocolate Crush" });
    fireEvent.click(screen.getByRole("button", { name: "Remover Chocolate Crush" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("heading", { name: "Carrinho vazio" })).toBeInTheDocument();
  });
});

describe("US-10 cart refresh against stock", () => {
  it("AC2: reduces a quantity above the stock and tells the customer why", async () => {
    serve([cookies]);
    setCart([{ productId: "cookies", quantity: 5 }]);
    render(<CartView />);

    expect(
      await screen.findByText("Cookies & Cream: só 3 disponíveis. Quantidade ajustada."),
    ).toBeInTheDocument();
    expect(
      screen
        .getByText("Cookies & Cream: só 3 disponíveis. Quantidade ajustada.")
        .closest("[role=status]"),
    ).not.toBeNull();
    expect(useCartStore.getState().lines).toEqual([{ productId: "cookies", quantity: 3 }]);
  });

  it("AC3: removes a sold-out product and names it", async () => {
    serve([
      makeProduct({ ...kiss, stockQuantity: 0, stockState: "SOLD_OUT", maxQuantity: 0 }),
      crush,
    ]);
    setCart([
      { productId: "kiss", quantity: 1 },
      { productId: "crush", quantity: 1 },
    ]);
    render(<CartView />);

    expect(
      await screen.findByText("Strawberry Kiss esgotou e saiu do carrinho."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Strawberry Kiss" })).not.toBeInTheDocument();
    expect(useCartStore.getState().lines).toEqual([{ productId: "crush", quantity: 1 }]);
  });

  it("AC3: removes a product that is no longer offered at all", async () => {
    serve([crush]);
    setCart([
      { productId: "gone", quantity: 1 },
      { productId: "crush", quantity: 1 },
    ]);
    render(<CartView />);
    expect(
      await screen.findByText("Um item não está mais disponível e saiu do carrinho."),
    ).toBeInTheDocument();
    expect(useCartStore.getState().lines).toEqual([{ productId: "crush", quantity: 1 }]);
  });

  it("explains why the cart is empty when its only item vanished", async () => {
    serve([]);
    setCart([{ productId: "gone", quantity: 1 }]);
    render(<CartView />);
    expect(await screen.findByRole("heading", { name: "Carrinho vazio" })).toBeInTheDocument();
    expect(screen.getByText(/saiu do carrinho/)).toBeInTheDocument();
  });

  it("waits for the persisted cart before fetching", async () => {
    serve([crush]);
    useCartStore.setState({ lines: [], hydrated: false });
    render(<CartView />);
    expect(api.GET).not.toHaveBeenCalled();
    useCartStore.setState({ lines: [{ productId: "crush", quantity: 1 }], hydrated: true });
    expect(await screen.findByRole("heading", { name: "Chocolate Crush" })).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledTimes(1);
  });
});

describe("failure and loading states", () => {
  it("shows a loading placeholder while the catalog loads", async () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => undefined) as never);
    setCart([{ productId: "crush", quantity: 1 }]);
    const { container } = render(<CartView />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("shows the load error and retries on 'Tentar de novo'", async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new Error("offline"));
    setCart([{ productId: "crush", quantity: 1 }]);
    render(<CartView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    // The retry succeeds this time.
    vi.mocked(api.GET).mockResolvedValue({ data: { products: [crush] } } as never);
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Chocolate Crush" })).toBeInTheDocument(),
    );
  });
});
