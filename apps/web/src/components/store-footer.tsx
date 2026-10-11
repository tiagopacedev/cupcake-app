import { Clock, MapPin } from "lucide-react";
import { STORE } from "shared";
import { InfoRow } from "@/components/info-row";

/** Catalog footer with the store info (04-ui-design-system.md §6.10); values come from the shared STORE config. */
export function StoreFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2.5 bg-secondary px-4 pt-6 pb-7 text-sm">
      <strong className="text-base font-extrabold">{STORE.name}</strong>
      <InfoRow icon={MapPin} iconClassName="size-4">
        {STORE.address}
      </InfoRow>
      <InfoRow icon={Clock} iconClassName="size-4">
        {STORE.openingHours}
      </InfoRow>
    </footer>
  );
}
