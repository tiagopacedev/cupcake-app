import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Header cart button (04-ui-design-system.md §6.1): "Carrinho" plus the count
 * of units, hidden at 0 (US-07). The count is a prop so this stays a plain
 * component; E5-08 feeds it from the cart store.
 */
export function CartLink({ count = 0 }: { count?: number }) {
  const label = count > 0 ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho";
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className="h-11 border-foreground px-3 font-semibold"
    >
      <Link href="/cart" aria-label={label}>
        <ShoppingBag className="size-5" aria-hidden="true" />
        Carrinho
        {count > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-xs font-bold tabular-nums">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}
