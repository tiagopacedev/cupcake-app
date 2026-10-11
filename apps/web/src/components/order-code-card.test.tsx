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

describe("US-18 AC3 success notice", () => {
  it("shows 'Pedido feito!' and removes the ?new flag from the URL without navigating", () => {
    window.history.replaceState(null, "", "/orders/CUP-7K3Q9F?new=1");
    render(<OrderSuccessNotice />);

    expect(screen.getByRole("status")).toHaveTextContent("Pedido feito! Pronto em ~15 min.");
    expect(window.location.pathname).toBe("/orders/CUP-7K3Q9F");
    expect(window.location.search).toBe("");
  });
});
