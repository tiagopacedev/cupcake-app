import type { Product } from "@/lib/api/types";
import type { CartLine } from "@/lib/cart-store";

export interface ReconcileResult {
  lines: CartLine[];
  /** pt-BR messages explaining what changed (04-ui-design-system.md §9.2). */
  notices: string[];
  changed: boolean;
}

/**
 * Brings the cart in line with the current catalog (US-10, BR-17): quantities
 * above the available stock are reduced, sold-out and vanished products are
 * removed, each with a message. Prices are never stored, so they are always
 * the current ones when displayed (US-08 AC4).
 *
 * A product that is no longer returned at all (deactivated) has no name to
 * show, hence the generic wording for that case (copy proposed in E5-11, not
 * yet in the UI doc's copy deck).
 */
export function reconcileCart(lines: CartLine[], products: Product[]): ReconcileResult {
  const byId = new Map(products.map((product) => [product.id, product]));
  const kept: CartLine[] = [];
  const notices: string[] = [];
  let vanished = 0;

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) {
      vanished += 1;
      continue;
    }
    if (product.maxQuantity < 1) {
      notices.push(`${product.name} esgotou e saiu do carrinho.`);
      continue;
    }
    if (line.quantity > product.maxQuantity) {
      const available =
        product.maxQuantity === 1 ? "só 1 disponível" : `só ${product.maxQuantity} disponíveis`;
      notices.push(`${product.name}: ${available}. Quantidade ajustada.`);
      kept.push({ productId: line.productId, quantity: product.maxQuantity });
      continue;
    }
    kept.push(line);
  }

  if (vanished === 1) {
    notices.push("Um item não está mais disponível e saiu do carrinho.");
  } else if (vanished > 1) {
    notices.push(`${vanished} itens não estão mais disponíveis e saíram do carrinho.`);
  }

  return { lines: kept, notices, changed: kept.length !== lines.length || notices.length > 0 };
}
