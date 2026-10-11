/**
 * The seed catalog itself (docs/03-data-model.md §8 "Seed catalog (US-21)"),
 * kept separate from seed.ts's Prisma orchestration so it's plain data with
 * no dependency on the generated Prisma Client — `seed.test.ts` can check
 * it against the spec without a database or `prisma generate` having run.
 */

export interface SeedCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface SeedProduct {
  name: string;
  slug: string;
  categorySlug: string;
  bestseller: boolean;
  priceCents: number;
  stockQuantity: number;
  description: string;
  imageUrl: string;
}

// Table order here is deliberate: it is the catalog display order
// (03-data-model.md §8), covers one bestseller per category plus the
// required low-stock (#4, "Restam 3") and sold-out (#6, "Esgotado") UI
// states, and `seedCatalog()` inserts/updates in this order so a
// first-time seed's `createdAt` ordering matches it too.
export const SEED_CATEGORIES: SeedCategory[] = [
  { name: "Clássicos", slug: "classics", sortOrder: 1 },
  { name: "Chocolate", slug: "chocolate", sortOrder: 2 },
  { name: "Frutados", slug: "fruity", sortOrder: 3 },
];

export const SEED_TAG = { name: "Mais vendido", slug: "bestseller" } as const;

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "Birthday Vanilla",
    slug: "birthday-vanilla",
    categorySlug: "classics",
    bestseller: true,
    priceCents: 990,
    stockQuantity: 40,
    description: "Baunilha · confeitos",
    imageUrl: "/images/products/birthday-vanilla.jpg",
  },
  {
    name: "Red Velvet Classic",
    slug: "red-velvet-classic",
    categorySlug: "classics",
    bestseller: false,
    priceCents: 1290,
    stockQuantity: 25,
    description: "Cacau · cream cheese",
    imageUrl: "/images/products/red-velvet-classic.jpg",
  },
  {
    name: "Chocolate Crush",
    slug: "chocolate-crush",
    categorySlug: "chocolate",
    bestseller: true,
    priceCents: 1190,
    stockQuantity: 35,
    description: "Chocolate · ganache",
    imageUrl: "/images/products/chocolate-crush.jpg",
  },
  {
    name: "Cookies & Cream",
    slug: "cookies-and-cream",
    categorySlug: "chocolate",
    bestseller: false,
    priceCents: 1290,
    // Deliberately low (UI state "Restam 3", 03-data-model.md §8 row 4).
    stockQuantity: 3,
    description: "Biscoito · creme",
    imageUrl: "/images/products/cookies-and-cream.jpg",
  },
  {
    name: "Strawberry Kiss",
    slug: "strawberry-kiss",
    categorySlug: "fruity",
    bestseller: true,
    priceCents: 1190,
    stockQuantity: 30,
    description: "Morango · creme rosa",
    imageUrl: "/images/products/strawberry-kiss.jpg",
  },
  {
    name: "Lemon Cream",
    slug: "lemon-cream",
    categorySlug: "fruity",
    bestseller: false,
    priceCents: 1190,
    // Deliberately zero (UI state "Esgotado", 03-data-model.md §8 row 6).
    stockQuantity: 0,
    description: "Limão siciliano · creme",
    imageUrl: "/images/products/lemon-cream.jpg",
  },
];
