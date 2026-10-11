import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CheckoutView } from "./checkout-view";
import { useCartStore } from "@/lib/cart-store";
import { LAST_ORDER_KEY } from "@/lib/last-order-store";
import { makeProduct } from "@/test-utils/fixtures";

vi.mock("@/lib/api/client", () => ({ api: { GET: vi.fn(), POST: vi.fn() } }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

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

const created = {
  code: "CUP-7K3Q9F",
  pickupStatus: "AWAITING_PICKUP",
  customerFirstName: "Ana",
  createdAt: "2026-10-11T17:35:00.000Z",
  readyAt: "2026-10-11T17:50:00.000Z",
  items: [],
  totalCents: 3570,
};
const apiError = (status: number, code: string, details?: object) => ({
  error: { error: { code, message: "x", requestId: "r", details } },
  response: { status },
});

const setCart = (
  lines = [
    { productId: "crush", quantity: 2 },
    { productId: "kiss", quantity: 1 },
  ],
) => useCartStore.setState({ lines, hydrated: true });
const submitButtons = () => screen.getAllByRole("button", { name: /Fazer pedido|Enviando/ });
const fill = (nameValue: string, phoneValue: string) => {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: nameValue } });
  fireEvent.change(screen.getByLabelText("Celular"), { target: { value: phoneValue } });
};
const money = (cents: string) => new RegExp(`^R\\$\\s${cents}$`);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useCartStore.setState({ lines: [], hydrated: true });
  vi.mocked(api.GET).mockResolvedValue({ data: { products: [crush, kiss] } } as never);
});

async function openCheckout() {
  setCart();
  render(<CheckoutView />);
  await screen.findByRole("heading", { name: "Resumo do pedido" });
}

describe("US-11 check out without an account", () => {
  it("AC3: shows only Nome and Celular, no account, address or payment fields", async () => {
    await openCheckout();
    expect(screen.getAllByRole("textbox").map((el) => el.getAttribute("name"))).toEqual([
      "name",
      "phone",
    ]);
    expect(document.querySelector("input[type=password], input[type=email]")).toBeNull();
    expect(screen.queryByLabelText(/senha|endere|cartão|pix/i)).not.toBeInTheDocument();
  });

  it("AC4: an empty cart redirects to the cart", async () => {
    useCartStore.setState({ lines: [], hydrated: true });
    render(<CheckoutView />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/cart"));
  });

  it("shows the privacy purpose line under 'Seus dados' (NFR-06)", async () => {
    await openCheckout();
    expect(
      screen.getByText(
        "Usamos seu nome e celular só para preparar e confirmar seu pedido na loja.",
      ),
    ).toBeInTheDocument();
  });

  it("masks the phone while typing", async () => {
    await openCheckout();
    fireEvent.change(screen.getByLabelText("Celular"), { target: { value: "11912345678" } });
    expect(screen.getByLabelText("Celular")).toHaveValue("(11) 91234-5678");
  });
});

describe("US-13 / US-14 order summary and pickup", () => {
  it("AC1: lists the lines, subtotal, free pickup and total", async () => {
    await openCheckout();
    const summary = screen.getByRole("heading", { name: "Resumo do pedido" }).closest("section");
    const view = within(summary as HTMLElement);
    expect(view.getByText("Chocolate Crush")).toBeInTheDocument();
    expect(view.getByText(/^2 × R\$\s11,90$/)).toBeInTheDocument();
    expect(view.getByText(money("23,80"))).toBeInTheDocument();
    expect(view.getByText("Subtotal")).toBeInTheDocument();
    expect(view.getByText("Retirada na loja")).toBeInTheDocument();
    expect(view.getByText("Grátis")).toBeInTheDocument();
    expect(view.getAllByText(money("35,70"))).toHaveLength(2); // subtotal and total
  });

  it("AC2: 'Editar' goes back to the cart", async () => {
    await openCheckout();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/cart");
  });

  it("US-13 AC3 / US-14 AC1: the pickup block shows the address and 'Pagamento na loja'", async () => {
    await openCheckout();
    const pickup = screen.getByRole("heading", { name: "Retirada" }).closest("section");
    expect(pickup).toHaveTextContent("Rua das Flores, 123 · Centro · São Paulo, SP");
    expect(pickup).toHaveTextContent("Pronto em ~15 min");
    expect(pickup).toHaveTextContent("Pagamento na loja");
  });

  it("US-10: refreshes the cart when it opens and says why a quantity changed", async () => {
    setCart([{ productId: "crush", quantity: 25 }]);
    render(<CheckoutView />);
    expect(
      await screen.findByText("Chocolate Crush: só 20 disponíveis. Quantidade ajustada."),
    ).toBeInTheDocument();
  });
});

describe("US-12 validation messages", () => {
  it("AC1: shows the name message on blur, and the order is not created", async () => {
    await openCheckout();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "A" } });
    fireEvent.blur(screen.getByLabelText("Nome"));
    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-invalid", "true");
  });

  it("AC2: shows the phone format hint on blur", async () => {
    await openCheckout();
    fireEvent.change(screen.getByLabelText("Celular"), { target: { value: "1131234567" } });
    fireEvent.blur(screen.getByLabelText("Celular"));
    expect(screen.getByText("Celular inválido. Ex.: (11) 91234-5678")).toBeInTheDocument();
  });

  it("shows both messages on submit, focuses the first invalid field and creates nothing", async () => {
    await openCheckout();
    fireEvent.click(submitButtons()[0]!);
    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByText("Celular inválido. Ex.: (11) 91234-5678")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("AC4: shows a server field error next to its field", async () => {
    vi.mocked(api.POST).mockResolvedValue(
      apiError(400, "VALIDATION_ERROR", {
        fields: [{ path: "customer.phone", message: "Invalid Brazilian mobile number" }],
      }) as never,
    );
    await openCheckout();
    fill("Ana Souza", "11912345678");
    fireEvent.click(submitButtons()[0]!);
    expect(await screen.findByText("Celular inválido. Ex.: (11) 91234-5678")).toBeInTheDocument();
    expect(submitButtons()[0]).toBeEnabled();
  });
});

describe("US-15 place the order", () => {
  it("AC1: sends name, phone and items; on 201 clears the cart, saves the latest order and opens Meu pedido", async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: created, response: { status: 201 } } as never);
    await openCheckout();
    fill("  Ana Souza ", "11912345678");
    fireEvent.click(submitButtons()[0]!);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/CUP-7K3Q9F?new=1"));
    expect(api.POST).toHaveBeenCalledWith("/api/orders", {
      body: {
        customer: { name: "Ana Souza", phone: "(11) 91234-5678" },
        items: [
          { productId: "crush", quantity: 2 },
          { productId: "kiss", quantity: 1 },
        ],
      },
    });
    expect(useCartStore.getState().lines).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(LAST_ORDER_KEY) ?? "null")).toEqual({
      code: "CUP-7K3Q9F",
      createdAt: "2026-10-11T17:35:00.000Z",
    });
    // The empty cart must not bounce the customer back to /cart.
    expect(replace).not.toHaveBeenCalledWith("/cart");
  });

  it("AC2 / US-11 AC5: the button is disabled with 'Enviando…' and a second tap sends nothing", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    vi.mocked(api.POST).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    await openCheckout();
    fill("Ana Souza", "11912345678");
    const form = screen.getByLabelText("Nome").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => expect(submitButtons()[0]).toBeDisabled());
    expect(submitButtons()[0]).toHaveTextContent("Enviando…");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.POST).toHaveBeenCalledTimes(1);

    await act(async () => resolve({ data: created, response: { status: 201 } }));
  });

  it("AC3: a network error shows a retry notice, re-enables the button and keeps the cart", async () => {
    vi.mocked(api.POST).mockRejectedValueOnce(new Error("offline"));
    await openCheckout();
    fill("Ana Souza", "11912345678");
    fireEvent.click(submitButtons()[0]!);

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Não foi possível carregar. Verifique sua conexão.");
    expect(submitButtons()[0]).toBeEnabled();
    expect(useCartStore.getState().lines).toHaveLength(2);
    expect(window.localStorage.getItem(LAST_ORDER_KEY)).toBeNull();

    vi.mocked(api.POST).mockResolvedValue({ data: created, response: { status: 201 } } as never);
    fireEvent.click(within(notice).getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/CUP-7K3Q9F?new=1"));
  });

  it("shows the rate-limit message without a review action", async () => {
    vi.mocked(api.POST).mockResolvedValue(apiError(429, "RATE_LIMITED") as never);
    await openCheckout();
    fill("Ana Souza", "11912345678");
    fireEvent.click(submitButtons()[0]!);
    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Muitas tentativas. Tente de novo em instantes.");
    expect(within(notice).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("US-19 stock changes during checkout", () => {
  it("AC1: shows 'só N disponível.' with 'Revisar', flags the summary line and keeps the cart", async () => {
    vi.mocked(api.POST).mockResolvedValue(
      apiError(409, "INSUFFICIENT_STOCK", {
        items: [{ productId: "crush", requested: 2, available: 1 }],
      }) as never,
    );
    await openCheckout();
    fill("Ana Souza", "11912345678");
    fireEvent.click(submitButtons()[0]!);

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Chocolate Crush: só 1 disponível.");
    expect(within(notice).getByRole("link", { name: "Revisar" })).toHaveAttribute("href", "/cart");
    expect(screen.getByText(/2 × R\$\s11,90 · só 1 disponível/)).toHaveClass("text-destructive");
    expect(useCartStore.getState().lines).toHaveLength(2);
    expect(window.localStorage.getItem(LAST_ORDER_KEY)).toBeNull();
    expect(submitButtons()[0]).toBeEnabled();
  });

  it("AC3: tells which product is no longer available", async () => {
    vi.mocked(api.POST).mockResolvedValue(
      apiError(409, "PRODUCT_NOT_FOUND", { productIds: ["kiss"] }) as never,
    );
    await openCheckout();
    fill("Ana Souza", "11912345678");
    fireEvent.click(submitButtons()[0]!);
    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Strawberry Kiss não está mais disponível.");
    expect(within(notice).getByRole("link", { name: "Revisar" })).toBeInTheDocument();
  });
});

describe("loading and failure states", () => {
  it("shows the load error with a retry when the catalog cannot be fetched", async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error("offline"));
    setCart();
    render(<CheckoutView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
