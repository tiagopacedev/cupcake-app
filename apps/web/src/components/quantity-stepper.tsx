import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Cart stepper (04-ui-design-system.md §6.5): minus is disabled at 1 (removal
 * has its own button, US-09), plus at the limit `max` = min(stock, 20) (US-06).
 */
export function QuantityStepper({
  name,
  quantity,
  max,
  onChange,
}: {
  name: string;
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Quantidade de ${name}`}
      className="inline-flex h-10 items-center rounded-lg border border-input"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Diminuir"
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus aria-hidden={true} />
      </Button>
      <output className="min-w-6 text-center text-sm font-semibold tabular-nums">{quantity}</output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Aumentar"
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus aria-hidden={true} />
      </Button>
    </div>
  );
}
