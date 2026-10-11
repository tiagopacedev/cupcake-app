import { AppHeader } from "@/components/app-header";
import { StoreFooter } from "@/components/store-footer";

/**
 * SCR-01 Catálogo (docs/04-ui-design-system.md §7.1). Header and footer only
 * for now (E5-01); the latest-order card, filter chips and product grid are
 * added by E5-02…E5-04.
 */
export default function HomePage() {
  return (
    <>
      <AppHeader variant="catalog" />
      <main className="flex flex-1 flex-col gap-5 px-4 pt-6 pb-8" />
      <StoreFooter />
    </>
  );
}
