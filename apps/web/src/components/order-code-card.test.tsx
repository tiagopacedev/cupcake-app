import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrderCodeCard } from "./order-code-card";
import { OrderSuccessNotice } from "./order-success-notice";

vi.mock("sonner", () => ({ toast: vi.fn() }));
import { toast } from "sonner";

const meta = "Ana · Hoje, 14:35 · pronto às 14:50";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("US-16 AC3 copy the code", () => {
  it("shows the hint, the code, the copy action and the meta line", () => {
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);
    expect(screen.getByText("Mostre este código no balcão")).toBeInTheDocument();
    expect(screen.getByText("CUP-7K3Q9F")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar código" })).toBeInTheDocument();
    expect(screen.getByText(meta)).toBeInTheDocument();
  });

  it("copies with the Clipboard API and confirms with a toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Código copiado"));
    expect(writeText).toHaveBeenCalledWith("CUP-7K3Q9F");
  });

  it("selects the code text instead when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }));
    await waitFor(() => expect(window.getSelection()?.toString()).toBe("CUP-7K3Q9F"));
    expect(toast).not.toHaveBeenCalled();
  });

  it("selects the code text when the Clipboard API does not exist", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }));
    await waitFor(() => expect(window.getSelection()?.toString()).toBe("CUP-7K3Q9F"));
  });
});

describe("US-23 share the code", () => {
  const url = "http://localhost:3000/orders/CUP-7K3Q9F";

  it("AC1: opens the share sheet with the code and the link to Meu pedido", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({
      title: "Cupcake Store",
      text: "Meu pedido CUP-7K3Q9F na Cupcake Store",
      url,
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it("AC2: without the Web Share API the text and link are copied and the toast says 'Link copiado'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share: undefined, clipboard: { writeText } });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Link copiado"));
    expect(writeText).toHaveBeenCalledWith(`Meu pedido CUP-7K3Q9F na Cupcake Store: ${url}`);
  });

  it("AC3: closing the share sheet does nothing else", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, share, clipboard: { writeText } });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("falls back to copying when the share sheet fails for another reason", async () => {
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share, clipboard: { writeText } });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Link copiado"));
  });

  it("selects the code text when neither sharing nor the clipboard works", async () => {
    vi.stubGlobal("navigator", { ...navigator, share: undefined, clipboard: undefined });
    render(<OrderCodeCard code="CUP-7K3Q9F" meta={meta} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(window.getSelection()?.toString()).toBe("CUP-7K3Q9F"));
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
