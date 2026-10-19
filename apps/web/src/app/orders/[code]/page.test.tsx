import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import OrderPage from "./page";
import type { Order } from "@/lib/api/types";

vi.mock("@/lib/orders", () => ({ fetchOrder: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

import { fetchOrder } from "@/lib/orders";

const order: Order = {
  code: "CUP-7K3Q9F",
  pickupStatus: "AWAITING_PICKUP",
  customerFirstName: "Ana",
  createdAt: "2026-10-11T17:35:00.000Z",
  readyAt: "2026-10-11T17:50:00.000Z",
  expiresAt: "2026-10-11T22:00:00.000Z", // closing time, 19:00 in Sao Paulo
  items: [
    {
      productId: "a",
      slug: "chocolate-crush",
      name: "Chocolate Crush",
      imageUrl: "/images/products/chocolate-crush.jpg",
      quantity: 2,
      unitPriceCents: 1190,
      lineTotalCents: 2380,
    },
    {
      productId: "b",
      slug: "birthday-vanilla",
      name: "Birthday Vanilla",
      imageUrl: "/images/products/birthday-vanilla.jpg",
      quantity: 1,
      unitPriceCents: 990,
      lineTotalCents: 990,
    },
  ],
  totalCents: 3370,
};

const renderPage = async (code = "CUP-7K3Q9F", flag?: string) =>
  render(
    await OrderPage({
      params: Promise.resolve({ code }),
      searchParams: Promise.resolve({ new: flag }),
    }),
  );

/** 17:00 on the order's day in Sao Paulo (the clock only matters for the pickup deadline). */
const sameDay = () =>
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-11T20:00:00.000Z") });

beforeEach(() => vi.mocked(fetchOrder).mockReset());
afterEach(() => vi.useRealTimers());

describe("SCR-04 Meu pedido (US-16 AC1, US-18, US-20)", () => {
  beforeEach(() => vi.mocked(fetchOrder).mockResolvedValue({ status: "ok", order }));

  it("US-16 AC1: shows the success notice, code, first name, times, items and the total to pay at the store", async () => {
    await renderPage("CUP-7K3Q9F", "1");

    expect(screen.getByRole("status")).toHaveTextContent("Pedido feito! Pronto em ~15 min.");
    expect(screen.getByText("Mostre este código no balcão")).toBeInTheDocument();
    expect(screen.getByText("CUP-7K3Q9F")).toBeInTheDocument();
    // 17:35Z is 14:35 in Sao Paulo; ready at 14:50. The date part depends on "today".
    expect(screen.getByText(/^Ana · .*14:35 · pronto às 14:50$/)).toBeInTheDocument();
    expect(screen.getByText("Chocolate Crush")).toBeInTheDocument();
    expect(screen.getByText(/^2 × R\$\s11,90$/)).toBeInTheDocument();
    expect(screen.getByText("Total a pagar na loja")).toBeInTheDocument();
    expect(screen.getAllByText(/^R\$\s33,70$/)).toHaveLength(2); // subtotal and total
  });

  it("US-14 AC2: labels the total 'Total a pagar na loja'", async () => {
    await renderPage();
    expect(screen.getByText("Total a pagar na loja")).toBeInTheDocument();
  });

  it("US-18 AC3: no success notice when the order is reopened", async () => {
    await renderPage("CUP-7K3Q9F");
    expect(screen.queryByText(/Pedido feito!/)).not.toBeInTheDocument();
    expect(screen.getByText("CUP-7K3Q9F")).toBeInTheDocument();
  });

  it("only the exact flag new=1 shows the notice", async () => {
    await renderPage("CUP-7K3Q9F", "0");
    expect(screen.queryByText(/Pedido feito!/)).not.toBeInTheDocument();
  });

  it("US-17 AC1: shows 'Onde retirar' with the address and opening hours", async () => {
    await renderPage();
    const pickup = screen.getByRole("heading", { name: "Onde retirar" }).closest("section");
    expect(pickup).toHaveTextContent("Rua das Flores, 123 · Centro · São Paulo, SP");
    expect(pickup).toHaveTextContent("Ter a dom, 10h às 19h");
  });

  it("BR-12: shows until when the order can be collected (the pickup deadline)", async () => {
    sameDay();
    await renderPage();
    const pickup = screen.getByRole("heading", { name: "Onde retirar" }).closest("section");
    expect(pickup).toHaveTextContent("Retire até hoje, 19:00");
  });

  it("the deadline reads 'amanhã' on the day before and the date after that", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-10T20:00:00.000Z") });
    await renderPage();
    expect(screen.getByText(/Retire até/)).toHaveTextContent("Retire até amanhã, 19:00");
    cleanup();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T20:00:00.000Z") });
    await renderPage();
    expect(screen.getByText(/Retire até/)).toHaveTextContent("Retire até 11/10, 19:00");
  });

  it("has the back link, the 'Voltar ao início' button and no status badge", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Meu pedido" })).toBeInTheDocument();
    const backLinks = screen.getAllByRole("link", { name: "Voltar ao início" });
    expect(backLinks).toHaveLength(2); // header arrow and bottom button
    backLinks.forEach((link) => expect(link).toHaveAttribute("href", "/"));
    expect(screen.queryByText(/Aguardando retirada/)).not.toBeInTheDocument();
  });

  it("BR-16: never shows a phone number or the surname", async () => {
    const { container } = await renderPage("CUP-7K3Q9F", "1");
    expect(container.textContent).not.toMatch(/\+55|\(\d\d\)|Souza/);
  });

  it("US-20 AC1: lists the items and quantities to hand over", async () => {
    await renderPage();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/Chocolate Crush.*2 × R\$\s11,90.*R\$\s23,80/);
    expect(items[1]).toMatch(/Birthday Vanilla.*1 × R\$\s9,90.*R\$\s9,90/);
  });
});

describe("BR-12 order placed outside opening hours", () => {
  it("shows the next-day ready time in the meta line and the success notice", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({
      status: "ok",
      order: {
        ...order,
        createdAt: "2026-10-14T01:00:00.000Z", // Tuesday 22:00
        readyAt: "2026-10-14T13:15:00.000Z", // Wednesday 10:15
        expiresAt: "2026-10-14T22:00:00.000Z",
      },
    });
    await renderPage("CUP-7K3Q9F", "1");
    expect(screen.getByText(/^Ana · .*22:00 · pronto amanhã às 10:15$/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Pedido feito! Pronto amanhã às 10:15.");
  });
});

describe("BR-20 / BR-21 final order states (US-18 AC4)", () => {
  it("EXPIRED: warns that the order expired, keeps the order visible and hides the pickup deadline", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({
      status: "ok",
      order: { ...order, pickupStatus: "EXPIRED" },
    });
    await renderPage();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este pedido expirou e as unidades foram liberadas.",
    );
    expect(screen.getByText("CUP-7K3Q9F")).toBeInTheDocument();
    expect(screen.getByText("Chocolate Crush")).toBeInTheDocument();
    expect(screen.queryByText(/Retire até/)).not.toBeInTheDocument();
  });

  it("PICKED_UP: says the order was picked up and hides the pickup deadline", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({
      status: "ok",
      order: { ...order, pickupStatus: "PICKED_UP" },
    });
    await renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Pedido retirado.");
    expect(screen.queryByText(/Retire até/)).not.toBeInTheDocument();
  });

  it("AWAITING_PICKUP shows neither notice", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({ status: "ok", order });
    await renderPage();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("order page states (US-18 AC2, US-20 AC2)", () => {
  it("shows 'Pedido não encontrado' with a way back for an unknown code", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({ status: "notfound" });
    await renderPage("CUP-ZZZZZZ");
    expect(
      screen.getByRole("heading", { level: 2, name: "Pedido não encontrado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Confira o código (CUP-XXXXXX).")).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "Voltar ao início" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows the failure state with a retry on a server or network error", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({ status: "error" });
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("does not show the success notice on a not-found order even with ?new=1", async () => {
    vi.mocked(fetchOrder).mockResolvedValue({ status: "notfound" });
    await renderPage("CUP-ZZZZZZ", "1");
    expect(screen.queryByText(/Pedido feito!/)).not.toBeInTheDocument();
  });
});
