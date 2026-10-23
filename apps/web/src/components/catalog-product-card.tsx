"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { selectQuantity, useCartStore } from "@/lib/cart-store";
import { quantityLimitMessage } from "@/lib/quantity-limit";
import type { Product } from "@/lib/api/types";

/**
 * ProductCard wired to the cart (US-05, US-06): the "+" button becomes a
 * stepper once the product is in the cart; "−" at 1 removes it; "+" stops at
 * `maxQuantity` (min(stock, 20), BR-06) and "Máximo disponível." appears (or, when the
 * cap of 20 is the limit, the "fale com a loja" message).
 * The server re-validates everything when the order is created (BR-05).
 */
export function CatalogProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const router = useRouter();
  const quantity = useCartStore(selectQuantity(product.id));
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const atMax = quantity >= product.maxQuantity;

  const action =
    quantity === 0 ? (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="size-10 bg-background"
        aria-label={`Adicionar ${product.name}`}
        onClick={() => {
          add(product.id, product.maxQuantity);
          toast("Adicionado ao carrinho", {
            action: { label: "Ver carrinho", onClick: () => router.push("/cart") },
          });
        }}
      >
        <Plus aria-hidden={true} />
      </Button>
    ) : (
      <div
        role="group"
        aria-label={`Quantidade de ${product.name}`}
        className="flex h-10 items-center rounded-lg bg-background"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Diminuir"
          onClick={() =>
            quantity === 1
              ? remove(product.id)
              : setQuantity(product.id, quantity - 1, product.maxQuantity)
          }
        >
          <Minus aria-hidden={true} />
        </Button>
        <output className="min-w-5 text-center text-sm font-semibold tabular-nums">
          {quantity}
        </output>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Aumentar"
          disabled={atMax}
          onClick={() => add(product.id, product.maxQuantity)}
        >
          <Plus aria-hidden={true} />
        </Button>
      </div>
    );

  return (
    <ProductCard
      product={product}
      priority={priority}
      action={action}
      notice={
        quantity > 0 && atMax ? (
          <p role="status" className="text-xs text-amber-800">
            {quantityLimitMessage(product.maxQuantity)}
          </p>
        ) : null
      }
    />
  );
}
