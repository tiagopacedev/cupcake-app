import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderCodeCard } from "./order-code-card";
import { OrderSuccessNotice } from "./order-success-notice";

const meta = "Ana · Hoje, 14:35 · pronto às 14:50";

describe("US-16 the order code block", () => {
  it("shows the hint, the code and the meta line, with no copy or share action (G-13)", () => {
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);
    expect(screen.getByText("Mostre este código no balcão")).toBeInTheDocument();
    expect(screen.getByText("CUP-7K3Q9F")).toBeInTheDocument();
    expect(screen.getByText(meta)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("US-18 AC3 success notice and the ready label (BR-12)", () => {
  const createdAt = "2026-10-13T17:35:00.000Z"; // Tuesday 14:35 in Sao Paulo

  it("shows 'Pedido feito!' and removes the ?new flag from the URL without navigating", () => {
    window.history.replaceState(null, "", "/orders/CUP-7K3Q9F?new=1");
    render(<OrderSuccessNotice createdAt={createdAt} readyAt="2026-10-13T17:50:00.000Z" />);

    expect(screen.getByRole("status")).toHaveTextContent("Pedido feito! Pronto em ~15 min.");
    expect(window.location.pathname).toBe("/orders/CUP-7K3Q9F");
    expect(window.location.search).toBe("");
  });

  it("outside opening hours says when the order will be ready instead of '~15 min'", () => {
    render(
      <OrderSuccessNotice
        createdAt="2026-10-14T01:00:00.000Z"
        readyAt="2026-10-14T13:15:00.000Z"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Pedido feito! Pronto amanhã às 10:15.");
  });
});
