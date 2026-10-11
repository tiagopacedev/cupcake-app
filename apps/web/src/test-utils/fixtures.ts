import type { Product } from "@/lib/api/types";

/** A catalog product as the API returns it (docs/openapi.yaml `Product`). */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b",
    slug: "birthday-vanilla",
    name: "Birthday Vanilla",
    description: "Baunilha · confeitos",
    priceCents: 990,
    imageUrl: "/images/products/birthday-vanilla.jpg",
    category: { slug: "classics", name: "Clássicos" },
    tags: [],
    stockQuantity: 40,
    stockState: "AVAILABLE",
    maxQuantity: 20,
    ...overrides,
  };
}

export const bestsellerTag = { slug: "bestseller", name: "Mais vendido" };
