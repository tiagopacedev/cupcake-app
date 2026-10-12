import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Header cart button (04-ui-design-system.md §6.1): on mobile only the bag
 * icon with the count of units on its corner, from `lg` the icon, the word
 * "Carrinho" and an inline count; hidden at 0 (US-07); the accessible name stays
 * "Carrinho, N itens". The count is a prop so this stays a plain
 * component; E5-08 feeds it from the cart store.
 */
export function CartLink({ count = 0 }: { count?: number }) {
  const label = count > 0 ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho";
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="relative size-11 border-foreground lg:size-auto lg:h-11 lg:px-3 lg:font-semibold"
    >
      <Link href="/cart" aria-label={label}>
        <ShoppingBag className="size-5" aria-hidden="true" />
        <span className="hidden lg:inline">Carrinho</span>
        {count > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none font-bold tabular-nums ring-2 ring-background lg:static lg:ring-0">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}
