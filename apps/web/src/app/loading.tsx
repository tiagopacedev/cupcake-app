import { AppHeader } from "@/components/app-header";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { StoreFooter } from "@/components/store-footer";

/** Streaming fallback for SCR-01 while the catalog loads. */
export default function Loading() {
  return (
    <>
      <AppHeader variant="catalog" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-8 lg:px-6 lg:py-12">
        <CatalogSkeleton />
      </main>
      <StoreFooter />
    </>
  );
}
