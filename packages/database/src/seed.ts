import { getPrisma } from "./client.js";
import type { PrismaClient } from "./generated/client/client.js";

/**
 * Seed catalog (docs/03-data-model.md §8 "Seed catalog (US-21)",
 * 06-development-workflow.md §5). Run with `pnpm db:seed`.
 *
 * Idempotent upsert by slug: safe to run repeatedly. Categories and the tag
 * always refresh their display fields. Products refresh their catalog
 * fields (name, description, price, category, photo) but **never** touch
 * `stockQuantity` on an update — only a brand-new product gets its seed
 * stock. This is the explicit policy in 06-development-workflow.md §5
 * ("Creates products with seed stock only if they don't exist; never resets
 * stock of existing products") so re-seeding never undoes real test orders.
 * Resetting stock on purpose is a separate, explicit script (`db:restock`,
 * not part of this task).
 */

interface SeedCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

interface SeedProduct {
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
// states, and `main()` inserts/updates in this order so a first-time seed's
// `createdAt` ordering matches it too.
const SEED_CATEGORIES: SeedCategory[] = [
  { name: "Clássicos", slug: "classics", sortOrder: 1 },
  { name: "Chocolate", slug: "chocolate", sortOrder: 2 },
  { name: "Frutados", slug: "fruity", sortOrder: 3 },
];

const SEED_TAG = { name: "Mais vendido", slug: "bestseller" } as const;

const SEED_PRODUCTS: SeedProduct[] = [
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

/** Runs the full seed against `db` (defaults to the shared singleton). Exported for seed tests (E2-04). */
export async function seedCatalog(db: PrismaClient = getPrisma()): Promise<void> {
  const categoriesBySlug = new Map<string, { id: string }>();
  for (const category of SEED_CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, sortOrder: category.sortOrder },
    });
    categoriesBySlug.set(category.slug, row);
  }

  const bestsellerTag = await db.tag.upsert({
    where: { slug: SEED_TAG.slug },
    create: SEED_TAG,
    update: { name: SEED_TAG.name },
  });

  for (const product of SEED_PRODUCTS) {
    const category = categoriesBySlug.get(product.categorySlug);
    if (!category) {
      throw new Error(`Seed bug: unknown category slug "${product.categorySlug}"`);
    }

    const row = await db.product.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        stockQuantity: product.stockQuantity,
        imageUrl: product.imageUrl,
        categoryId: category.id,
      },
      // No `stockQuantity` here on purpose — see the module doc comment.
      update: {
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        categoryId: category.id,
      },
    });

    if (product.bestseller) {
      await db.productTag.upsert({
        where: { productId_tagId: { productId: row.id, tagId: bestsellerTag.id } },
        create: { productId: row.id, tagId: bestsellerTag.id },
        update: {},
      });
    } else {
      // Idempotent either way: a product that lost bestseller status
      // between seed revisions shouldn't keep the tag.
      await db.productTag.deleteMany({
        where: { productId: row.id, tagId: bestsellerTag.id },
      });
    }
  }
}

async function main(): Promise<void> {
  await seedCatalog();
  console.log(
    `Seeded ${SEED_CATEGORIES.length} categories, 1 tag, ${SEED_PRODUCTS.length} products.`,
  );
}

// Only run when invoked directly (`pnpm db:seed` / `tsx src/seed.ts`), not
// when `seedCatalog` is imported by a test.
const isMainModule =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main()
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
