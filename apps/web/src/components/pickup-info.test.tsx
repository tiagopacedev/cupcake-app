import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PickupInfo } from "./pickup-info";

/** Tuesday 2026-10-13 14:35 in Sao Paulo: the store is open. */
const TUESDAY_AFTERNOON = new Date("2026-10-13T17:35:00.000Z");

// Only `Date` is faked: the labels depend on the time of day.
beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: TUESDAY_AFTERNOON }));
afterEach(() => vi.useRealTimers());

describe("US-13 AC3/AC4, US-17 checkout pickup block (BR-12, BR-09)", () => {
  const block = () => screen.getByRole("heading", { name: "Retirada" }).closest("section");

  it("open: address, 'Pronto em ~15 min' and 'Pagamento na loja'", () => {
    render(<PickupInfo variant="checkout" />);
    expect(block()).toHaveTextContent("Rua das Flores, 123 · Centro · São Paulo, SP");
    expect(block()).toHaveTextContent("Pronto em ~15 min");
    expect(block()).toHaveTextContent("Pagamento na loja");
  });

  it("closed: says when it will be ready, still with 'Pagamento na loja'", () => {
    vi.setSystemTime(new Date("2026-10-14T01:00:00.000Z")); // Tuesday 22:00
    render(<PickupInfo variant="checkout" />);
    expect(block()).toHaveTextContent("Pronto amanhã às 10:15");
    expect(block()).not.toHaveTextContent("~15 min");
    expect(block()).toHaveTextContent("Pagamento na loja");
  });

  it("last 15 minutes before closing: the order rolls to tomorrow", () => {
    vi.setSystemTime(new Date("2026-10-13T21:40:00.000Z")); // Tuesday 18:40
    render(<PickupInfo variant="checkout" />);
    expect(block()).toHaveTextContent("Pronto amanhã às 10:15");
  });

  it("never shows payment fields or a paid status (BR-09)", () => {
    render(<PickupInfo variant="checkout" />);
    expect(block()).not.toHaveTextContent(/pix|cartão|pago/i);
  });
});

describe("US-17 AC1 'Onde retirar' on Meu pedido", () => {
  const block = () => screen.getByRole("heading", { name: "Onde retirar" }).closest("section");

  it("shows the address, the opening hours and the pickup deadline", () => {
    render(<PickupInfo variant="order" expiresAt="2026-10-13T22:00:00.000Z" />);
    expect(block()).toHaveTextContent("Rua das Flores, 123 · Centro · São Paulo, SP");
    expect(block()).toHaveTextContent("Ter a dom, 10h às 19h");
    expect(block()).toHaveTextContent("Retire até hoje, 19:00");
  });

  it("omits the deadline when the order is no longer awaiting pickup", () => {
    render(<PickupInfo variant="order" />);
    expect(block()).not.toHaveTextContent("Retire até");
  });
});
