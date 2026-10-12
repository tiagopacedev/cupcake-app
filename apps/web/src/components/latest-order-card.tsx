"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { clearLastOrder, readTodaysLastOrder } from "@/lib/last-order-store";

/**
 * Latest-order card of the home page (04-ui-design-system.md §6.2, §8.3,
 * US-22, BR-19). Shown only when the browser's stored order was created today
 * (America/Sao_Paulo) and the API says it is still AWAITING_PICKUP; a code the
 * API doesn't know is removed; a network error hides the card silently. No
 * skeleton: the card simply appears or doesn't.
 */
export function LatestOrderCard() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = readTodaysLastOrder();
    if (!stored) return;

    let cancelled = false;
    api
      .GET("/api/orders/{code}", {
        params: { path: { code: stored.code } },
        cache: "no-store",
      })
      .then(({ data, response }) => {
        if (cancelled) return;
        if (data) {
          if (data.pickupStatus === "AWAITING_PICKUP") setCode(data.code);
        } else if (response.status === 404) {
          clearLastOrder();
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!code) return null;

  return (
    <Link
      href={`/orders/${code}`}
      aria-label={`Seu pedido ${code}, aguardando retirada`}
      className="flex items-center gap-3 rounded-lg bg-secondary py-3 pr-3 pl-4"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">Seu pedido</span>
        <span className="text-base font-bold tracking-wide tabular-nums">{code}</span>
      </span>
      <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700">
        Aguardando retirada
      </Badge>
      <ChevronRight className="size-5 shrink-0" aria-hidden={true} />
    </Link>
  );
}
