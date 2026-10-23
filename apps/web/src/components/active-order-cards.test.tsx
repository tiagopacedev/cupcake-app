import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ActiveOrderCards } from "./active-order-cards";
import { ORDERS_KEY, readOrders, saveOrder } from "@/lib/recent-orders-store";

vi.mock("@/lib/api/client", () => ({ api: { GET: vi.fn() } }));
import { api } from "@/lib/api/client";

type Answer = { status: number; pickupStatus?: string } | "offline";

/** Answers each `GET /api/orders/{code}` according to `answers[code]`. */
function serve(answers: Record<string, Answer>) {
  vi.mocked(api.GET).mockImplementation((async (
    _path: string,
    init: { params: { path: { code: string } } },
  ) => {
    const code = init.params.path.code;
    const answer = answers[code];
    if (!answer || answer === "offline") throw new Error("offline");
    return {
      data: answer.pickupStatus ? { code, pickupStatus: answer.pickupStatus } : undefined,
      response: { status: answer.status },
    };
  }) as never);
}
const awaiting = { status: 200, pickupStatus: "AWAITING_PICKUP" };

const A = "CUP-AAAAAA";
const B = "CUP-BBBBBB";
const C = "CUP-CCCCCC";
const order = (code: string, createdAt = new Date().toISOString()) => ({ code, createdAt });

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("US-22 active order cards on the home page", () => {
  it("AC1: shows 'Seu pedido · CUP-XXXXXX · Aguardando retirada' for an awaiting order", async () => {
    saveOrder(order(A));
    serve({ [A]: awaiting });
    render(<ActiveOrderCards />);

    const card = await screen.findByRole("link", {
      name: "Seu pedido CUP-AAAAAA, aguardando retirada",
    });
    expect(card).toHaveTextContent("Seu pedido");
    expect(card).toHaveTextContent("CUP-AAAAAA");
    expect(card).toHaveTextContent("Aguardando retirada");
  });

  it("AC2: each card opens Meu pedido for its code", async () => {
    saveOrder(order(A));
    serve({ [A]: awaiting });
    render(<ActiveOrderCards />);
    expect(await screen.findByRole("link")).toHaveAttribute("href", "/orders/CUP-AAAAAA");
  });

  it("AC3: no card and no request when nothing is stored", () => {
    const { container } = render(<ActiveOrderCards />);
    expect(container).toBeEmptyDOMElement();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it.each(["PICKED_UP", "EXPIRED"])(
    "AC3/AC4: no card for a %s order, and its code is removed",
    async (pickupStatus) => {
      saveOrder(order(A));
      serve({ [A]: { status: 200, pickupStatus } });
      const { container } = render(<ActiveOrderCards />);
      await waitFor(() => expect(readOrders()).toEqual([]));
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("AC4: an unknown code hides the card and removes the stored code", async () => {
    saveOrder(order(A));
    serve({ [A]: { status: 404 } });
    const { container } = render(<ActiveOrderCards />);
    await waitFor(() => expect(readOrders()).toEqual([]));
    expect(container).toBeEmptyDOMElement();
  });

  it("AC5: two orders show two cards, newest first", async () => {
    saveOrder(order(A));
    saveOrder(order(B));
    serve({ [A]: awaiting, [B]: awaiting });
    render(<ActiveOrderCards />);

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/orders/CUP-BBBBBB",
      "/orders/CUP-AAAAAA",
    ]);
  });

  it("AC6: an order placed on a previous day still gets its card while it awaits pickup (BR-19, finding 6)", async () => {
    saveOrder(order(A, "2020-01-01T15:00:00.000Z"));
    serve({ [A]: awaiting });
    render(<ActiveOrderCards />);
    expect(await screen.findByRole("link", { name: /CUP-AAAAAA/ })).toBeInTheDocument();
  });

  it("shows only the cards of orders that are still active", async () => {
    saveOrder(order(A));
    saveOrder(order(B));
    saveOrder(order(C));
    serve({ [A]: awaiting, [B]: { status: 200, pickupStatus: "EXPIRED" }, [C]: awaiting });
    render(<ActiveOrderCards />);

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.queryByRole("link", { name: /CUP-BBBBBB/ })).not.toBeInTheDocument();
    expect(readOrders().map((o) => o.code)).toEqual([C, A]);
  });

  it("hides a card silently on a network error and keeps its stored code", async () => {
    saveOrder(order(A));
    serve({ [A]: "offline" });
    const { container } = render(<ActiveOrderCards />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(window.localStorage.getItem(ORDERS_KEY)).not.toBeNull();
    expect(readOrders()).toHaveLength(1);
  });

  it("one unreachable order does not hide the others", async () => {
    saveOrder(order(A));
    saveOrder(order(B));
    serve({ [A]: awaiting, [B]: "offline" });
    render(<ActiveOrderCards />);
    expect(await screen.findByRole("link", { name: /CUP-AAAAAA/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /CUP-BBBBBB/ })).not.toBeInTheDocument();
    expect(readOrders()).toHaveLength(2);
  });

  it("keeps the stored code on a server error (only a 404, PICKED_UP or EXPIRED removes it)", async () => {
    saveOrder(order(A));
    serve({ [A]: { status: 500 } });
    render(<ActiveOrderCards />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(readOrders()).toHaveLength(1);
  });

  it("picks up an order stored under the v1.0.0 key", async () => {
    window.localStorage.setItem("cupcake.lastOrder", JSON.stringify(order(A)));
    serve({ [A]: awaiting });
    render(<ActiveOrderCards />);
    expect(await screen.findByRole("link", { name: /CUP-AAAAAA/ })).toBeInTheDocument();
  });
});
