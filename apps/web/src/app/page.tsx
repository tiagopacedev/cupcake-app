import { AppHeader } from "@/components/app-header";
import { LoadError } from "@/components/load-error";
import { ProductCard } from "@/components/product-card";
import { StoreFooter } from "@/components/store-footer";
import { fetchProducts } from "@/lib/catalog";

/**
 * SCR-01 Catálogo (docs/04-ui-design-system.md §7.1), server-rendered from
 * `GET /api/products` (US-01). Latest-order card, filter chips and the add
 * controls arrive with E5-03…E5-06.
 */
export default async function HomePage() {
  const products = await fetchProducts();

  return (
    <>
      <AppHeader variant="catalog" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 pb-8 lg:px-6 lg:py-12">
        {products ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <LoadError />
        )}
      </main>
      <StoreFooter />
    </>
  );
}
