import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";

export interface SummaryLine {
  id: string;
  name: string;
  imageUrl: string;
  quantity: number;
  unitPriceCents: number;
}

/**
 * Order summary (04-ui-design-system.md §6.9). `checkout`: "Resumo do pedido"
 * with "Editar" and the pickup row, total labelled "Total". `order` (Meu
 * pedido): no header, no pickup row, "Total a pagar na loja" (BR-09). A line
 * in `shortages` shows " · só N disponível" in red (US-19). The summary is
 * never removed from checkout (US-13); `children` renders inside it (desktop
 * puts the submit button there).
 */
export function OrderSummary({
  lines,
  variant,
  shortages = {},
  children,
}: {
  lines: SummaryLine[];
  variant: "checkout" | "order";
  shortages?: Record<string, number>;
  children?: ReactNode;
}) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const checkout = variant === "checkout";

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-secondary p-4 lg:p-6">
      {checkout && (
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Resumo do pedido</h2>
          <Link href="/cart" className="text-sm font-semibold underline underline-offset-4">
            Editar
          </Link>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {lines.map((line) => {
          const available = shortages[line.id];
          return (
            <li key={line.id} className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted lg:size-14">
                {/* Decorative: the name is right next to it (§8.5). */}
                <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{line.name}</p>
                <p
                  className={
                    available === undefined
                      ? "text-sm text-muted-foreground tabular-nums"
                      : "text-sm text-destructive tabular-nums"
                  }
                >
                  {line.quantity} × {formatPrice(line.unitPriceCents)}
                  {available !== undefined &&
                    ` · ${available === 1 ? "só 1 disponível" : `só ${available} disponíveis`}`}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatPrice(line.quantity * line.unitPriceCents)}
              </span>
            </li>
          );
        })}
      </ul>
      <Separator />
      <div className="flex items-center justify-between text-sm">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      {checkout && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Retirada na loja</span>
          <span>Grátis</span>
        </div>
      )}
      <Separator />
      <div className="flex items-center justify-between">
        <span className="font-bold">{checkout ? "Total" : "Total a pagar na loja"}</span>
        <span className="text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      {children}
    </section>
  );
}
