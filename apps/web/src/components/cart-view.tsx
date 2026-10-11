"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartLine } from "@/components/cart-line";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { selectTotalUnits, useCartStore } from "@/lib/cart-store";
import { useCartRefresh } from "@/lib/use-cart-refresh";

/**
 * SCR-02 body (04-ui-design-system.md §7.2): refreshes the cart against the
 * server when it opens (US-10), lists the lines with steppers and inline
 * remove confirmation (US-08, US-09), the totals box and the sticky
 * "Continuar" bar. Total = sum of lines at current prices, no fees (BR-08).
 */
export function CartView() {
  const refresh = useCartRefresh();
  const lines = useCartStore((state) => state.lines);
  const units = useCartStore(selectTotalUnits);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const mainClass = "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-6";

  if (refresh.status === "loading") {
    return (
      <main className={mainClass} aria-busy="true">
        {[0, 1].map((key) => (
          <div key={key} className="flex gap-3 py-2">
            <Skeleton className="size-23 shrink-0 bg-muted" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4 bg-muted" />
              <Skeleton className="h-5 w-1/3 bg-muted" />
            </div>
          </div>
        ))}
      </main>
    );
  }

  if (refresh.status === "error") {
    return (
      <main className={mainClass}>
        <LoadError onRetry={refresh.retry} />
      </main>
    );
  }

  const notices = refresh.notices.map((message) => <Notice key={message}>{message}</Notice>);

  if (lines.length === 0) {
    return (
      <main className={mainClass}>
        {notices}
        <EmptyState icon={ShoppingBag} title="Carrinho vazio" description="Escolha seus cupcakes.">
          <Button asChild size="lg" className="h-12">
            <Link href="/">Ver cupcakes</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  const rows = lines.flatMap((line) => {
    const product = refresh.products.get(line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.product.priceCents * row.quantity, 0);

  return (
    <>
      <main className={mainClass}>
        {notices}
        <ul>
          {rows.map(({ product, quantity }) => (
            <CartLine
              key={product.id}
              product={product}
              quantity={quantity}
              confirmingRemoval={confirmingId === product.id}
              onQuantityChange={(next) => setQuantity(product.id, next, product.maxQuantity)}
              onRemoveRequest={() => setConfirmingId(product.id)}
              onRemoveConfirm={() => {
                remove(product.id);
                setConfirmingId(null);
              }}
              onRemoveCancel={() => setConfirmingId(null)}
            />
          ))}
        </ul>
        <section className="flex flex-col gap-2.5 rounded-lg bg-secondary p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal ({units === 1 ? "1 item" : `${units} itens`})</span>
            <span className="tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Retirada na loja</span>
            <span>Grátis</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</span>
          </div>
        </section>
      </main>
      <div className="sticky bottom-0 bg-background px-4 pt-3 pb-5">
        <div className="mx-auto w-full max-w-2xl">
          <Button asChild size="lg" className="h-12 w-full">
            <Link href="/checkout">Continuar</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
