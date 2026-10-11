import { Clock, MapPin } from "lucide-react";
import { STORE } from "shared";
import { InfoRow } from "@/components/info-row";

/**
 * Pickup information from the shared STORE config (04-ui-design-system.md
 * §6.10, US-17). `checkout` ("Retirada"): address and "Pronto em ~15 min ·
 * Pagamento na loja" (BR-09), boxed with the store name and hours on desktop.
 * `order` ("Onde retirar", Meu pedido): address and opening hours.
 */
export function PickupInfo({ variant }: { variant: "checkout" | "order" }) {
  if (variant === "order") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Onde retirar</h2>
        <InfoRow icon={MapPin}>{STORE.address}</InfoRow>
        <InfoRow icon={Clock}>{STORE.openingHours}</InfoRow>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 lg:rounded-lg lg:border lg:p-5">
      <h2 className="text-lg font-bold lg:text-base">Retirada</h2>
      <InfoRow icon={MapPin}>
        <span className="hidden lg:inline">{STORE.name} · </span>
        {STORE.address}
      </InfoRow>
      <InfoRow icon={Clock}>
        Pronto em ~{STORE.readyMinutes} min
        <span className="hidden lg:inline"> · {STORE.openingHours}</span> · Pagamento na loja
      </InfoRow>
    </section>
  );
}
