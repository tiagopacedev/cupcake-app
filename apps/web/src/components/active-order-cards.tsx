"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { readOrders, removeOrder } from "@/lib/recent-orders-store";

/**
 * Cards for the active orders of this browser, on the home page (04-ui-design-system.md
 * §6.2, §8.3, US-22, BR-19). Every stored order (up to 5) is looked up; a card is shown
 * for each one the API returns as AWAITING_PICKUP, whatever day it was placed. A code the
 * API doesn't know, or that was picked up or expired, is removed from the browser; a
 * network error hides that card silently and keeps the code. No skeleton: cards simply
 * appear.
 */
export function ActiveOrderCards() {
  const [stored, setStored] = useState<string[]>([]);
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const orders = readOrders();
    if (orders.length === 0) return;
    setStored(orders.map((order) => order.code));

    let cancelled = false;
    for (const { code } of orders) {
      api
        .GET("/api/orders/{code}", { params: { path: { code } }, cache: "no-store" })
        .then(({ data, response }) => {
          if (cancelled) return;
          if (data) {
            if (data.pickupStatus === "AWAITING_PICKUP") {
              setActive((current) => new Set(current).add(data.code));
            } else {
              removeOrder(code);
            }
          } else if (response.status === 404) {
            removeOrder(code);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const codes = stored.filter((code) => active.has(code));
  if (codes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {codes.map((code) => (
        <Link
          key={code}
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
      ))}
    </div>
  );
}
