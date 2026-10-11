-- CHECK constraints Prisma Migrate can't express from the schema alone
-- (docs/03-data-model.md §10, 06-development-workflow.md §5). Copied
-- verbatim (names and expressions) from
-- docs/diagrams/database/physical-model.sql so the two stay equivalent —
-- checked by the schema-diff test (05-testing-strategy.md §3.3).

ALTER TABLE "categories" ADD CONSTRAINT "categories_name_len"
  CHECK (char_length(btrim(name)) BETWEEN 2 AND 50);
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_fmt"
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "tags" ADD CONSTRAINT "tags_name_len"
  CHECK (char_length(btrim(name)) BETWEEN 2 AND 50);
ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_fmt"
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "products" ADD CONSTRAINT "products_name_len"
  CHECK (char_length(btrim(name)) BETWEEN 2 AND 80);
ALTER TABLE "products" ADD CONSTRAINT "products_slug_fmt"
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "products" ADD CONSTRAINT "products_desc_len"
  CHECK (char_length(btrim(description)) BETWEEN 10 AND 300);
ALTER TABLE "products" ADD CONSTRAINT "products_price_pos"      -- BR-07
  CHECK (price_cents > 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonneg"   -- BR-04
  CHECK (stock_quantity >= 0);

ALTER TABLE "customers" ADD CONSTRAINT "customers_name_len"     -- BR-14
  CHECK (char_length(btrim(name)) BETWEEN 2 AND 80);
ALTER TABLE "customers" ADD CONSTRAINT "customers_phone_fmt"    -- BR-14 (E.164)
  CHECK (phone ~ '^\+55[1-9]{2}9[0-9]{8}$');

ALTER TABLE "orders" ADD CONSTRAINT "orders_code_fmt"           -- BR-13
  CHECK (code ~ '^CUP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$');
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_pos"
  CHECK (total_cents > 0);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_range"  -- BR-06
  CHECK (quantity BETWEEN 1 AND 20);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_pos"  -- BR-07
  CHECK (unit_price_cents > 0);
