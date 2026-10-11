-- =====================================================================
-- Cupcake App · Physical data model (PostgreSQL 16)
-- Source of truth for the physical design described in docs/03-data-model.md.
-- Phase 4: the Prisma schema in packages/database must produce an
-- equivalent schema; CHECK constraints that Prisma can't express are
-- added through a raw SQL migration.
-- =====================================================================

-- ---------- Enumerated types -----------------------------------------
-- Payment happens at the store counter and is not recorded by the app (BR-09).
CREATE TYPE pickup_status AS ENUM ('AWAITING_PICKUP', 'PICKED_UP');

-- ---------- Catalog --------------------------------------------------
CREATE TABLE categories (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(50)  NOT NULL,
  slug        varchar(50)  NOT NULL,
  sort_order  smallint     NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_key  UNIQUE (name),
  CONSTRAINT categories_slug_key  UNIQUE (slug),
  CONSTRAINT categories_name_len  CHECK (char_length(btrim(name)) BETWEEN 2 AND 50),
  CONSTRAINT categories_slug_fmt  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE tags (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(50)  NOT NULL,
  slug        varchar(50)  NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_key  UNIQUE (name),
  CONSTRAINT tags_slug_key  UNIQUE (slug),
  CONSTRAINT tags_name_len  CHECK (char_length(btrim(name)) BETWEEN 2 AND 50),
  CONSTRAINT tags_slug_fmt  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE products (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid          NOT NULL,
  name            varchar(80)   NOT NULL,
  slug            varchar(80)   NOT NULL,
  description     varchar(300)  NOT NULL,
  price_cents     integer       NOT NULL,
  stock_quantity  integer       NOT NULL DEFAULT 0,   -- decremented when an order is created (BR-11)
  image_url       varchar(500)  NOT NULL,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT products_category_fk   FOREIGN KEY (category_id)
                                    REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT products_name_key      UNIQUE (name),
  CONSTRAINT products_slug_key      UNIQUE (slug),
  CONSTRAINT products_name_len      CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  CONSTRAINT products_slug_fmt      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT products_desc_len      CHECK (char_length(btrim(description)) BETWEEN 10 AND 300),
  CONSTRAINT products_price_pos     CHECK (price_cents > 0),            -- BR-07
  CONSTRAINT products_stock_nonneg  CHECK (stock_quantity >= 0)         -- BR-04
);
CREATE INDEX products_category_id_idx ON products (category_id);

CREATE TABLE product_tags (
  product_id  uuid  NOT NULL,
  tag_id      uuid  NOT NULL,
  CONSTRAINT product_tags_pkey        PRIMARY KEY (product_id, tag_id),
  CONSTRAINT product_tags_product_fk  FOREIGN KEY (product_id)
                                      REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT product_tags_tag_fk      FOREIGN KEY (tag_id)
                                      REFERENCES tags (id) ON DELETE CASCADE
);
CREATE INDEX product_tags_tag_id_idx ON product_tags (tag_id);

-- ---------- Customers and orders -------------------------------------
CREATE TABLE customers (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(80)  NOT NULL,
  phone       varchar(14)  NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT customers_phone_key  UNIQUE (phone),                                -- BR-15
  CONSTRAINT customers_name_len   CHECK (char_length(btrim(name)) BETWEEN 2 AND 80), -- BR-14
  CONSTRAINT customers_phone_fmt  CHECK (phone ~ '^\+55[1-9]{2}9[0-9]{8}$')       -- BR-14 (E.164)
);

CREATE TABLE orders (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  code            varchar(10)     NOT NULL,
  customer_id     uuid            NOT NULL,
  total_cents     integer         NOT NULL,
  pickup_status   pickup_status   NOT NULL DEFAULT 'AWAITING_PICKUP',      -- BR-10
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT orders_customer_fk     FOREIGN KEY (customer_id)
                                    REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT orders_code_key        UNIQUE (code),                                          -- BR-13
  CONSTRAINT orders_code_fmt        CHECK (code ~ '^CUP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'), -- BR-13
  CONSTRAINT orders_total_pos       CHECK (total_cents > 0)
);
CREATE INDEX orders_customer_id_idx ON orders (customer_id);

CREATE TABLE order_items (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid         NOT NULL,
  product_id        uuid         NOT NULL,
  quantity          integer      NOT NULL,
  unit_price_cents  integer      NOT NULL,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT order_items_order_fk        FOREIGN KEY (order_id)
                                         REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk      FOREIGN KEY (product_id)
                                         REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT order_items_order_product_key UNIQUE (order_id, product_id),
  CONSTRAINT order_items_quantity_range  CHECK (quantity BETWEEN 1 AND 20),  -- BR-06
  CONSTRAINT order_items_unit_price_pos  CHECK (unit_price_cents > 0)        -- BR-07
);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);
-- order_items (order_id) is covered by the leading column of order_items_order_product_key.
