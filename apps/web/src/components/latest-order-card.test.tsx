import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LatestOrderCard } from "./latest-order-card";
import { LAST_ORDER_KEY, saveLastOrder } from "@/lib/last-order-store";

vi.mock("@/lib/api/client", () => ({ api: { GET: vi.fn() } }));
import { api } from "@/lib/api/client";

const nowIso = () => new Date().toISOString();
const serve = (data: object | undefined, status = 200) =>
  vi.mocked(api.GET).mockResolvedValue({ data, response: { status } } as never);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("US-22 latest order card on the home page", () => {
  it("AC1: shows 'Seu pedido · CUP-XXXXXX · Aguardando retirada' for today's awaiting order", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    serve({ code: "CUP-7K3Q9F", pickupStatus: "AWAITING_PICKUP" });
    render(<LatestOrderCard />);

    const card = await screen.findByRole("link", {
      name: "Seu pedido CUP-7K3Q9F, aguardando retirada",
    });
    expect(card).toHaveTextContent("Seu pedido");
    expect(card).toHaveTextContent("CUP-7K3Q9F");
    expect(card).toHaveTextContent("Aguardando retirada");
  });

  it("AC2: the card opens Meu pedido for that code", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    serve({ code: "CUP-7K3Q9F", pickupStatus: "AWAITING_PICKUP" });
    render(<LatestOrderCard />);
    expect(await screen.findByRole("link")).toHaveAttribute("href", "/orders/CUP-7K3Q9F");
  });

  it("AC3: no card and no request when nothing is stored", () => {
    const { container } = render(<LatestOrderCard />);
    expect(container).toBeEmptyDOMElement();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it("AC3: no card and no request when the stored order is from a previous day", () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: "2020-01-01T15:00:00.000Z" });
    const { container } = render(<LatestOrderCard />);
    expect(container).toBeEmptyDOMElement();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it("AC3: no card when the order is no longer awaiting pickup", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    serve({ code: "CUP-7K3Q9F", pickupStatus: "PICKED_UP" });
    const { container } = render(<LatestOrderCard />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("AC4: an unknown code hides the card and removes the stored code", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    serve(undefined, 404);
    const { container } = render(<LatestOrderCard />);
    await waitFor(() => expect(window.localStorage.getItem(LAST_ORDER_KEY)).toBeNull());
    expect(container).toBeEmptyDOMElement();
  });

  it("hides the card silently on a network error and keeps the stored code", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    vi.mocked(api.GET).mockRejectedValue(new Error("offline"));
    const { container } = render(<LatestOrderCard />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(window.localStorage.getItem(LAST_ORDER_KEY)).not.toBeNull();
  });

  it("keeps the stored code on a server error (only a 404 removes it)", async () => {
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: nowIso() });
    serve(undefined, 500);
    render(<LatestOrderCard />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(window.localStorage.getItem(LAST_ORDER_KEY)).not.toBeNull();
  });
});
