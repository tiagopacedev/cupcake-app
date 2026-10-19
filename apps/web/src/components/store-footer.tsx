import { Clock, MapPin } from "lucide-react";
import { STORE, formatOpeningHours } from "shared";
import { InfoRow } from "@/components/info-row";

/**
 * Catalog footer with the store info (04-ui-design-system.md §6.10, ref 01 and
 * 08): stacked and centered on mobile, one row in the desktop container. Values
 * come from the shared STORE config (D-24), so the footer is part of the first
 * paint with nothing to load.
 */
export function StoreFooter() {
  return (
    <footer className="mt-auto bg-secondary text-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2.5 px-4 pt-6 pb-7 lg:flex-row lg:justify-between lg:px-6 lg:py-8">
        <strong className="text-base font-extrabold">{STORE.name}</strong>
        <InfoRow icon={MapPin} iconClassName="size-4">
          {STORE.address}
        </InfoRow>
        <InfoRow icon={Clock} iconClassName="size-4">
          {formatOpeningHours(STORE.openingHours)}
        </InfoRow>
      </div>
    </footer>
  );
}
