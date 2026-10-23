"use client";

import { CalendarClock, Clock, MapPin } from "lucide-react";
import { STORE, computePickup, formatOpeningHours } from "shared";
import { InfoRow } from "@/components/info-row";
import { formatDeadline, formatReadyLabel } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type PickupInfoProps = { variant: "checkout" } | { variant: "order"; expiresAt?: string };

/** The ready label of the checkout (BR-12): the same function the server uses to set the order's time. */
function checkoutReadyLabel(now: Date): string | null {
  try {
    const { readyAt } = computePickup({ ...STORE, createdAt: now });
    return formatReadyLabel(readyAt.toISOString(), now, STORE.readyMinutes);
  } catch {
    return null; // misconfigured hours: say nothing rather than something wrong
  }
}

/**
 * Pickup information from the shared STORE config (04-ui-design-system.md §6.10,
 * US-17, BR-12). `checkout` ("Retirada"): address and "{ready label} · Pagamento
 * na loja" (BR-09), boxed with the store name and hours on desktop. `order`
 * ("Onde retirar", Meu pedido): address, opening hours and, while the order
 * awaits pickup, until when it can be collected.
 */
export function PickupInfo(props: PickupInfoProps) {
  const now = useNow();

  if (props.variant === "order") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Onde retirar</h2>
        <InfoRow icon={MapPin}>{STORE.address}</InfoRow>
        <InfoRow icon={Clock}>{formatOpeningHours(STORE.openingHours)}</InfoRow>
        {props.expiresAt && (
          <InfoRow icon={CalendarClock}>
            <span suppressHydrationWarning>Retire até {formatDeadline(props.expiresAt, now)}</span>
          </InfoRow>
        )}
      </section>
    );
  }

  const readyLabel = checkoutReadyLabel(now);

  return (
    <section className="flex flex-col gap-3 lg:rounded-lg lg:border lg:p-5">
      <h2 className="text-lg font-bold lg:text-base">Retirada</h2>
      <InfoRow icon={MapPin}>
        <span className="hidden lg:inline">{STORE.name} · </span>
        {STORE.address}
      </InfoRow>
      <InfoRow icon={Clock}>
        {readyLabel && <span suppressHydrationWarning>{readyLabel}</span>}
        <span className="hidden lg:inline">
          {readyLabel ? " · " : ""}
          {formatOpeningHours(STORE.openingHours)}
        </span>{" "}
        · Pagamento na loja
      </InfoRow>
    </section>
  );
}
