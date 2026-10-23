import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestPool } from "./helpers/db.js";

/**
 * 05-testing-strategy.md §3.3 "Database": the migrated database must match
 * `docs/diagrams/database/physical-model.sql` — compared here by
 * `information_schema` + `pg_constraint` names, exactly as that section
 * specifies. The expected sets below are transcribed from
 * `physical-model.sql` (and its two mirrored Prisma migrations,
 * `prisma/migrations/20261011000001_init` and `..._check_constraints`), so
 * this test fails the moment either drifts from the other.
 */

const EXPECTED_TABLES = [
  "categories",
  "customers",
  "order_items",
  "orders",
  "product_tags",
  "products",
  "tags",
].sort();

const EXPECTED_PRIMARY_KEYS = [
  "categories_pkey",
  "customers_pkey",
  "order_items_pkey",
  "orders_pkey",
  "product_tags_pkey",
  "products_pkey",
  "tags_pkey",
].sort();

const EXPECTED_FOREIGN_KEYS = [
  "order_items_order_fk",
  "order_items_product_fk",
  "orders_customer_fk",
  "product_tags_product_fk",
  "product_tags_tag_fk",
  "products_category_fk",
].sort();

// docs/03-data-model.md §6.2 "Constraint-to-rule map".
const EXPECTED_CHECK_CONSTRAINTS = [
  "categories_name_len",
  "categories_slug_fmt",
  "tags_name_len",
  "tags_slug_fmt",
  "products_name_len",
  "products_slug_fmt",
  "products_desc_len",
  "products_price_pos",
  "products_stock_nonneg",
  "customers_name_len",
  "customers_phone_fmt",
  "orders_code_fmt",
  "orders_total_pos",
  "order_items_quantity_range",
  "order_items_unit_price_pos",
  "orders_ready_after_created",
  "orders_expires_after_ready",
].sort();

const EXPECTED_UNIQUE_INDEXES = [
  "categories_name_key",
  "categories_slug_key",
  "tags_name_key",
  "tags_slug_key",
  "products_name_key",
  "products_slug_key",
  "customers_phone_key",
  "orders_code_key",
  "order_items_order_product_key",
].sort();

const EXPECTED_NON_UNIQUE_INDEXES = [
  "products_category_id_idx",
  "product_tags_tag_id_idx",
  "orders_customer_id_idx",
  "orders_status_expires_at_idx",
  "order_items_product_id_idx",
].sort();

describe("E2-02 schema-diff: migrated DB vs physical-model.sql", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createTestPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("has exactly the 7 documented tables", async () => {
    // `_prisma_migrations` is Prisma's own migration-history bookkeeping
    // table, created by `prisma migrate deploy` alongside the real schema —
    // not part of physical-model.sql, so it's excluded here rather than
    // added to EXPECTED_TABLES.
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         AND table_name <> '_prisma_migrations'
       ORDER BY table_name`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual(EXPECTED_TABLES);
  });

  it("has exactly the documented primary key constraints", async () => {
    const names = await constraintNames(pool, "p");
    expect(names).toEqual(EXPECTED_PRIMARY_KEYS);
  });

  it("has exactly the documented foreign key constraints", async () => {
    const names = await constraintNames(pool, "f");
    expect(names).toEqual(EXPECTED_FOREIGN_KEYS);
  });

  it("has exactly the 17 documented CHECK constraints (03-data-model.md §9)", async () => {
    const names = await constraintNames(pool, "c");
    expect(names).toEqual(EXPECTED_CHECK_CONSTRAINTS);
  });

  it("has exactly the documented unique indexes", async () => {
    const names = await indexNames(pool, true);
    expect(names).toEqual(EXPECTED_UNIQUE_INDEXES);
  });

  it("has exactly the documented non-unique lookup indexes", async () => {
    const names = await indexNames(pool, false);
    expect(names).toEqual(EXPECTED_NON_UNIQUE_INDEXES);
  });

  it("pickup_status enum has exactly AWAITING_PICKUP, PICKED_UP and EXPIRED, in that order", async () => {
    const { rows } = await pool.query<{ enumlabel: string }>(
      `SELECT e.enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'pickup_status'
       ORDER BY e.enumsortorder`,
    );
    expect(rows.map((r) => r.enumlabel)).toEqual(["AWAITING_PICKUP", "PICKED_UP", "EXPIRED"]);
  });
});

async function constraintNames(pool: Pool, contype: "p" | "f" | "c"): Promise<string[]> {
  // Excludes `_prisma_migrations` (Prisma's own migration-history
  // bookkeeping table, not part of physical-model.sql) — see the comment on
  // the table-listing test above.
  const { rows } = await pool.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace AND contype = $1
       AND conrelid::regclass::text <> '_prisma_migrations'
     ORDER BY conname`,
    [contype],
  );
  return rows.map((r) => r.conname);
}

async function indexNames(pool: Pool, unique: boolean): Promise<string[]> {
  // Primary-key indexes are backed by a pg_constraint row too (contype 'p'),
  // excluded here so this only reports the hand-declared indexes
  // (`CREATE [UNIQUE] INDEX` in the migrations) rather than every index.
  const { rows } = await pool.query<{ indexname: string }>(
    `SELECT ic.relname AS indexname
     FROM pg_index i
     JOIN pg_class ic ON ic.oid = i.indexrelid
     JOIN pg_class tc ON tc.oid = i.indrelid
     JOIN pg_namespace n ON n.oid = tc.relnamespace
     WHERE n.nspname = 'public'
       AND i.indisunique = $1
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint c
         WHERE c.conindid = i.indexrelid AND c.contype = 'p'
       )
     ORDER BY ic.relname`,
    [unique],
  );
  return rows.map((r) => r.indexname);
}
