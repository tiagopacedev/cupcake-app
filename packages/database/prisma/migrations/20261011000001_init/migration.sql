-- Initial schema (02-architecture.md §4, docs/03-data-model.md, physical
-- source of truth docs/diagrams/database/physical-model.sql). Everything
-- Prisma Migrate can express: the enum, tables, primary/foreign keys,
-- unique constraints and indexes. The CHECK constraints Prisma can't
-- express are added by 20261011000002_check_constraints.
--
-- Hand-written in this form because this environment's network policy
-- blocks binaries.prisma.sh (the Prisma schema-engine download), so
-- `prisma migrate dev` could not generate it here. It is the schema-engine
-- equivalent of running `prisma migrate dev` against prisma/schema.prisma
-- and should be regenerated/verified with that command the first time it
-- runs somewhere with normal internet access (CI, Vercel, or a dev
-- machine) — see docs/08-execution-plan.md E2-02.

-- ---------- Enumerated types -----------------------------------------
CREATE TYPE "pickup_status" AS ENUM ('AWAITING_PICKUP', 'PICKED_UP');

-- ---------- Catalog --------------------------------------------------
CREATE TABLE "categories" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "name"       varchar(50) NOT NULL,
  "slug"       varchar(50) NOT NULL,
  "sort_order" smallint    NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

CREATE TABLE "tags" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "name"       varchar(50) NOT NULL,
  "slug"       varchar(50) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

CREATE TABLE "products" (
  "id"             uuid         NOT NULL DEFAULT gen_random_uuid(),
  "category_id"    uuid         NOT NULL,
  "name"           varchar(80)  NOT NULL,
  "slug"           varchar(80)  NOT NULL,
  "description"    varchar(300) NOT NULL,
  "price_cents"    integer      NOT NULL,
  "stock_quantity" integer      NOT NULL DEFAULT 0,
  "image_url"      varchar(500) NOT NULL,
  "is_active"      boolean      NOT NULL DEFAULT true,
  "created_at"     timestamptz  NOT NULL DEFAULT now(),
  "updated_at"     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_name_key" ON "products"("name");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

CREATE TABLE "product_tags" (
  "product_id" uuid NOT NULL,
  "tag_id"     uuid NOT NULL,

  CONSTRAINT "product_tags_pkey" PRIMARY KEY ("product_id", "tag_id")
);

CREATE INDEX "product_tags_tag_id_idx" ON "product_tags"("tag_id");

-- ---------- Customers and orders -------------------------------------
CREATE TABLE "customers" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "name"       varchar(80) NOT NULL,
  "phone"      varchar(14) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

CREATE TABLE "orders" (
  "id"            uuid          NOT NULL DEFAULT gen_random_uuid(),
  "code"          varchar(10)   NOT NULL,
  "customer_id"   uuid          NOT NULL,
  "total_cents"   integer       NOT NULL,
  "pickup_status" "pickup_status" NOT NULL DEFAULT 'AWAITING_PICKUP',
  "created_at"    timestamptz   NOT NULL DEFAULT now(),
  "updated_at"    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

CREATE TABLE "order_items" (
  "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
  "order_id"         uuid        NOT NULL,
  "product_id"       uuid        NOT NULL,
  "quantity"         integer     NOT NULL,
  "unit_price_cents" integer     NOT NULL,
  "created_at"       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_items_order_product_key" ON "order_items"("order_id", "product_id");
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- ---------- Foreign keys ----------------------------------------------
ALTER TABLE "products" ADD CONSTRAINT "products_category_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_fk"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_fk"
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_fk"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_fk"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_fk"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
