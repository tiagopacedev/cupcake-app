import { pathToFileURL } from "node:url";
import { getPrisma } from "./client.js";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_TAG } from "./seed-catalog.js";
import type { PrismaClient } from "./generated/client/client.js";

/**
 * Seed catalog (docs/03-data-model.md §8 "Seed catalog (US-21)",
 * 06-development-workflow.md §5). Run with `pnpm db:seed`. The catalog data
 * itself lives in `seed-catalog.ts` (kept Prisma-free so `seed.test.ts` can
 * check it against the spec without a database); this file is just the
 * Prisma orchestration.
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
// `pathToFileURL` so the comparison also holds on Windows (`file:///C:/…` vs `C:…`).
const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
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
