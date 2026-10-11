import Link from "next/link";
import { X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { OrderCodeCard } from "@/components/order-code-card";
import { OrderSuccessNotice } from "@/components/order-success-notice";
import { OrderSummary } from "@/components/order-summary";
import { PickupInfo } from "@/components/pickup-info";
import { Button } from "@/components/ui/button";
import { formatDayMonth, formatTime, isToday } from "@/lib/format";
import { fetchOrder } from "@/lib/orders";

const mainClass = "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-5 pb-6";

/**
 * SCR-04 Meu pedido (docs/04-ui-design-system.md §7.4), server-rendered from
 * `GET /api/orders/{code}`. One page for "just placed" (`?new=1`) and
 * "reopened" (US-18); staff use the same page at the counter (US-20). Shows
 * the first name only, never the phone (BR-16), and no status badge.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  const { code } = await params;
  const justPlaced = (await searchParams).new === "1";
  const result = await fetchOrder(code);

  return (
    <>
      <AppHeader variant="inner" title="Meu pedido" backHref="/" backLabel="Voltar ao início" />
      <main className={mainClass}>
        {result.status === "error" && <LoadError />}
        {result.status === "notfound" && (
          <EmptyState
            icon={X}
            title="Pedido não encontrado"
            description="Confira o código (CUP-XXXXXX)."
          >
            <Button asChild variant="outline" size="lg" className="h-12 border-input">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </EmptyState>
        )}
        {result.status === "ok" && (
          <>
            {justPlaced && <OrderSuccessNotice />}
            <OrderCodeCard
              code={result.order.code}
              meta={[
                result.order.customerFirstName,
                `${
                  isToday(result.order.createdAt) ? "Hoje" : formatDayMonth(result.order.createdAt)
                }, ${formatTime(result.order.createdAt)}`,
                `pronto às ${formatTime(result.order.readyAt)}`,
              ].join(" · ")}
            />
            <OrderSummary
              variant="order"
              lines={result.order.items.map((item) => ({
                id: item.productId,
                name: item.name,
                imageUrl: item.imageUrl,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
              }))}
            />
            <PickupInfo variant="order" />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="mt-auto h-12 w-full border-input"
            >
              <Link href="/">Voltar ao início</Link>
            </Button>
          </>
        )}
      </main>
    </>
  );
}
