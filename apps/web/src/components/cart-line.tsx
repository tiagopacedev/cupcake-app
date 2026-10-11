import Image from "next/image";
import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/api/types";

/**
 * One cart row (04-ui-design-system.md §6.6): photo, name and current unit
 * price, trash button, stepper and line total. Removal asks for confirmation
 * inline (US-09): "Remover" or "Cancelar".
 */
export function CartLine({
  product,
  quantity,
  confirmingRemoval,
  onQuantityChange,
  onRemoveRequest,
  onRemoveConfirm,
  onRemoveCancel,
}: {
  product: Product;
  quantity: number;
  confirmingRemoval: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemoveRequest: () => void;
  onRemoveConfirm: () => void;
  onRemoveCancel: () => void;
}) {
  return (
    <li className="border-b py-4">
      <div className="flex gap-3">
        <div className="relative size-23 shrink-0 overflow-hidden rounded-lg bg-muted">
          {/* Decorative here: the name is right next to it (§8.5). */}
          <Image src={product.imageUrl} alt="" fill sizes="92px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold">{product.name}</h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatPrice(product.priceCents)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mt-1.5 -mr-2 size-11 text-muted-foreground"
              aria-label={`Remover ${product.name}`}
              onClick={onRemoveRequest}
            >
              <Trash2 aria-hidden={true} />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <QuantityStepper
              name={product.name}
              quantity={quantity}
              max={product.maxQuantity}
              onChange={onQuantityChange}
            />
            <span className="text-sm font-semibold tabular-nums">
              {formatPrice(product.priceCents * quantity)}
            </span>
          </div>
        </div>
      </div>
      {confirmingRemoval && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border p-4">
          <p className="font-medium">Remover {product.name}?</p>
          <div className="flex gap-3">
            <Button type="button" size="lg" className="h-12 flex-1" onClick={onRemoveConfirm}>
              Remover
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 flex-1 border-input"
              onClick={onRemoveCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
