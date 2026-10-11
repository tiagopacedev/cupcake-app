import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { LatestOrderCard } from "@/components/latest-order-card";
import { LoadError } from "@/components/load-error";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { StoreFooter } from "@/components/store-footer";
import { Button } from "@/components/ui/button";
import { fetchProducts } from "@/lib/catalog";
import { parseFilter, queryForFilter } from "@/lib/filters";

/**
 * SCR-01 Catálogo (docs/04-ui-design-system.md §7.1), server-rendered from
 * `GET /api/products` for the `?filter=` in the URL (US-01…US-03), with the
 * latest-order card of this browser above the chips (US-22).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const filter = parseFilter((await searchParams).filter);
  const products = await fetchProducts(queryForFilter(filter));

  return (
    <>
      <AppHeader variant="catalog" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 pb-8 lg:px-6 lg:py-12">
        <LatestOrderCard />
        <FilterChips selected={filter} />
        {products === null ? (
          <LoadError />
        ) : products.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum cupcake aqui"
            description="Veja todos os sabores."
          >
            <Button asChild size="lg" className="h-12">
              <Link href="/">Ver todos</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
            {products.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <StoreFooter />
    </>
  );
}
