import { describe, expect, it } from "vitest";
import { reconcileCart } from "./cart-reconcile";
import { makeProduct } from "@/test-utils/fixtures";

const product = (id: string, name: string, stock: number) =>
  makeProduct({
    id,
    name,
    stockQuantity: stock,
    maxQuantity: Math.min(stock, 20),
    stockState: stock === 0 ? "SOLD_OUT" : stock <= 5 ? "LOW" : "AVAILABLE",
  });

describe("US-10 reconcile the cart with the server", () => {
  it("keeps lines that are still valid and reports nothing", () => {
    const lines = [{ productId: "a", quantity: 2 }];
    expect(reconcileCart(lines, [product("a", "Chocolate Crush", 10)])).toEqual({
      lines,
      notices: [],
      changed: false,
    });
  });

  it("AC2: reduces the quantity to the available stock and says why", () => {
    const result = reconcileCart(
      [{ productId: "a", quantity: 5 }],
      [product("a", "Cookies & Cream", 3)],
    );
    expect(result.lines).toEqual([{ productId: "a", quantity: 3 }]);
    expect(result.notices).toEqual(["Cookies & Cream: só 3 disponíveis. Quantidade ajustada."]);
    expect(result.changed).toBe(true);
  });

  it("uses the singular when only one unit is left", () => {
    const result = reconcileCart([{ productId: "a", quantity: 2 }], [product("a", "Lemon", 1)]);
    expect(result.notices).toEqual(["Lemon: só 1 disponível. Quantidade ajustada."]);
  });

  it("caps at 20 even when the stock is larger (BR-06)", () => {
    const result = reconcileCart(
      [{ productId: "a", quantity: 25 }],
      [product("a", "Birthday Vanilla", 40)],
    );
    expect(result.lines).toEqual([{ productId: "a", quantity: 20 }]);
  });

  it("AC3: removes a sold-out product and names it", () => {
    const result = reconcileCart(
      [
        { productId: "a", quantity: 1 },
        { productId: "b", quantity: 2 },
      ],
      [product("a", "Lemon Cream", 0), product("b", "Chocolate Crush", 10)],
    );
    expect(result.lines).toEqual([{ productId: "b", quantity: 2 }]);
    expect(result.notices).toEqual(["Lemon Cream esgotou e saiu do carrinho."]);
  });

  it("AC3: removes a product the API no longer returns (inactive)", () => {
    const result = reconcileCart([{ productId: "gone", quantity: 1 }], []);
    expect(result.lines).toEqual([]);
    expect(result.notices).toEqual(["Um item não está mais disponível e saiu do carrinho."]);
  });

  it("summarizes several vanished products in one notice", () => {
    const result = reconcileCart(
      [
        { productId: "x", quantity: 1 },
        { productId: "y", quantity: 1 },
      ],
      [],
    );
    expect(result.notices).toEqual(["2 itens não estão mais disponíveis e saíram do carrinho."]);
  });

  it("keeps the order of the remaining lines", () => {
    const result = reconcileCart(
      [
        { productId: "a", quantity: 1 },
        { productId: "b", quantity: 1 },
        { productId: "c", quantity: 9 },
      ],
      [product("a", "A", 5), product("b", "B", 0), product("c", "C", 2)],
    );
    expect(result.lines).toEqual([
      { productId: "a", quantity: 1 },
      { productId: "c", quantity: 2 },
    ]);
  });
});
