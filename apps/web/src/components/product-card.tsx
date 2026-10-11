import type { ReactNode } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/api/types";

/**
 * Catalog card (04-ui-design-system.md §6.4): photo with the bestseller badge,
 * name, price, descriptor and the stock state. `action` is the add button or
 * stepper (E5-06), pinned to the photo corner; a sold-out product never gets
 * one (BR-04). `notice` renders under the text, e.g. the stock-limit message.
 */
export function ProductCard({
  product,
  action,
  notice,
  priority = false,
}: {
  product: Product;
  action?: ReactNode;
  notice?: ReactNode;
  /** Preload the photo: set for the cards visible without scrolling (LCP). */
  priority?: boolean;
}) {
  const soldOut = product.stockState === "SOLD_OUT";
  const low = product.stockState === "LOW";
  const bestseller = product.tags.some((tag) => tag.slug === "bestseller");

  return (
    <article className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 368px, 50vw"
          className={cn("object-cover", soldOut && "opacity-50 grayscale")}
        />
        {bestseller && (
          <Badge variant="secondary" className="absolute top-2 left-2 bg-background">
            <Star className="size-3 fill-current" aria-hidden={true} />
            Mais vendido
          </Badge>
        )}
        {!soldOut && action && <div className="absolute right-2 bottom-2">{action}</div>}
      </div>
      <div className="flex flex-col gap-0.5">
        <h2 className={cn("text-base font-bold", soldOut && "text-muted-foreground")}>
          {product.name}
        </h2>
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn("text-sm font-semibold tabular-nums", soldOut && "text-muted-foreground")}
          >
            {formatPrice(product.priceCents)}
          </span>
          {low && (
            <Badge variant="secondary" className="bg-amber-100 tabular-nums text-amber-800">
              Restam {product.stockQuantity}
            </Badge>
          )}
          {soldOut && (
            <Badge variant="secondary" className="bg-destructive/10 text-destructive">
              Esgotado
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{product.description}</p>
      </div>
      {notice}
    </article>
  );
}
