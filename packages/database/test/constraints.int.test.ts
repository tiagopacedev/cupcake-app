import { beforeEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestPool, truncateAll } from "./helpers/db.js";

/**
 * The 14 invalid operations of 03-data-model.md §9 "Validation evidence",
 * each asserted against the specific constraint that must reject it
 * (05-testing-strategy.md §3.3). Raw `pg`, not Prisma Client, mirroring
 * schema-diff.int.test.ts — this suite doesn't depend on `prisma generate`.
 *
 * Each test gets a fresh, minimal fixture (one category, two products, one
 * customer, one order with one line) via `beforeEach`, so every case is
 * isolated to the single constraint it's meant to exercise.
 */

interface Fixture {
  categoryId: string;
  productId: string;
  product2Id: string;
  customerId: string;
  orderId: string;
}

describe("E2-02 constraint violations (03-data-model.md §9)", () => {
  let pool: Pool;
  let fx: Fixture;

  beforeAll(() => {
    pool = createTestPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(pool);

    const category = await pool.query<{ id: string }>(
      `INSERT INTO categories (name, slug, sort_order) VALUES ('Clássicos', 'classics', 1) RETURNING id`,
    );
    const categoryId = category.rows[0]!.id;

    const product = await pool.query<{ id: string }>(
      `INSERT INTO products (category_id, name, slug, description, price_cents, stock_quantity, image_url)
       VALUES ($1, 'Fixture Product', 'fixture-product', 'Descrição de teste', 1000, 10, '/images/products/fixture.jpg')
       RETURNING id`,
      [categoryId],
    );
    const productId = product.rows[0]!.id;

    const product2 = await pool.query<{ id: string }>(
      `INSERT INTO products (category_id, name, slug, description, price_cents, stock_quantity, image_url)
       VALUES ($1, 'Fixture Product 2', 'fixture-product-2', 'Descrição de teste 2', 1000, 10, '/images/products/fixture-2.jpg')
       RETURNING id`,
      [categoryId],
    );
    const product2Id = product2.rows[0]!.id;

    const customer = await pool.query<{ id: string }>(
      `INSERT INTO customers (name, phone) VALUES ('Fixture Customer', '+5511987654321') RETURNING id`,
    );
    const customerId = customer.rows[0]!.id;

    const order = await pool.query<{ id: string }>(
      `INSERT INTO orders (code, customer_id, total_cents) VALUES ('CUP-23456A', $1, 1000) RETURNING id`,
      [customerId],
    );
    const orderId = order.rows[0]!.id;

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES ($1, $2, 1, 1000)`,
      [orderId, productId],
    );

    fx = { categoryId, productId, product2Id, customerId, orderId };
  });

  it("1. phone missing the +55 country code is rejected by customers_phone_fmt", async () => {
    await expectConstraint(
      pool.query(`INSERT INTO customers (name, phone) VALUES ('Ana', '11912345678')`),
      "customers_phone_fmt",
    );
  });

  it("2. landline-style number (no mobile 9) is rejected by customers_phone_fmt", async () => {
    await expectConstraint(
      pool.query(`INSERT INTO customers (name, phone) VALUES ('Ana', '+5511812345678')`),
      "customers_phone_fmt",
    );
  });

  it("3. a 1-character name is rejected by customers_name_len", async () => {
    await expectConstraint(
      pool.query(`INSERT INTO customers (name, phone) VALUES ('A', '+5511987654322')`),
      "customers_name_len",
    );
  });

  it("4. negative stock is rejected by products_stock_nonneg", async () => {
    await expectConstraint(
      pool.query(`UPDATE products SET stock_quantity = -1 WHERE id = $1`, [fx.productId]),
      "products_stock_nonneg",
    );
  });

  it("5. zero price is rejected by products_price_pos", async () => {
    await expectConstraint(
      pool.query(`UPDATE products SET price_cents = 0 WHERE id = $1`, [fx.productId]),
      "products_price_pos",
    );
  });

  it("6. a duplicate order code is rejected by orders_code_key", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO orders (code, customer_id, total_cents) VALUES ('CUP-23456A', $1, 500)`,
        [fx.customerId],
      ),
      "orders_code_key",
    );
  });

  it("7. an order code with excluded characters (0/O/1/I/L) is rejected by orders_code_fmt", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO orders (code, customer_id, total_cents) VALUES ('CUP-000000', $1, 500)`,
        [fx.customerId],
      ),
      "orders_code_fmt",
    );
  });

  it("8. an order total of 0 is rejected by orders_total_pos", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO orders (code, customer_id, total_cents) VALUES ('CUP-23456B', $1, 0)`,
        [fx.customerId],
      ),
      "orders_total_pos",
    );
  });

  it("9. the removed status value NOT_READY is rejected by the pickup_status enum", async () => {
    await expect(
      pool.query(`UPDATE orders SET pickup_status = 'NOT_READY' WHERE id = $1`, [fx.orderId]),
    ).rejects.toMatchObject({ code: "22P02" });
  });

  it("10. a line quantity of 21 is rejected by order_items_quantity_range", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES ($1, $2, 21, 1000)`,
        [fx.orderId, fx.product2Id],
      ),
      "order_items_quantity_range",
    );
  });

  it("11. the same product twice in one order is rejected by order_items_order_product_key", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES ($1, $2, 1, 1000)`,
        [fx.orderId, fx.productId],
      ),
      "order_items_order_product_key",
    );
  });

  it("12. deleting a category in use is rejected by products_category_fk (RESTRICT)", async () => {
    await expectConstraint(
      pool.query(`DELETE FROM categories WHERE id = $1`, [fx.categoryId]),
      "products_category_fk",
    );
  });

  it("13. deleting an ordered product is rejected by order_items_product_fk (RESTRICT)", async () => {
    await expectConstraint(
      pool.query(`DELETE FROM products WHERE id = $1`, [fx.productId]),
      "order_items_product_fk",
    );
  });

  it("14. a slug with spaces and capitals is rejected by categories_slug_fmt", async () => {
    await expectConstraint(
      pool.query(
        `INSERT INTO categories (name, slug, sort_order) VALUES ('Bolos', 'Has Spaces', 2)`,
      ),
      "categories_slug_fmt",
    );
  });
});

/** Asserts a query rejects with a Postgres error naming the given constraint. */
async function expectConstraint(
  queryPromise: Promise<unknown>,
  constraintName: string,
): Promise<void> {
  await expect(queryPromise).rejects.toMatchObject({ constraint: constraintName });
}
