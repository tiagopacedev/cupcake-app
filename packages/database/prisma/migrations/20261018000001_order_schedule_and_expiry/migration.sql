-- E9-08 · Stored pickup schedule and order expiry
-- (docs/03-data-model.md, physical source of truth
-- docs/diagrams/database/physical-model.sql; PRD BR-12, BR-20; D-24, D-25).
--
-- 1. `orders.ready_at` / `orders.expires_at`: the pickup schedule the API computes
--    from the store's opening hours (packages/shared/src/store.ts) and stores.
-- 2. `pickup_status` gets `EXPIRED`.
--
-- Existing orders are backfilled with the pre-v1.1 rule (ready = created + 15
-- min) and the closing time (19:00 America/Sao_Paulo) of the ready day, or of
-- the next day when that time has already passed. They therefore expire on
-- the first API request after the migration, releasing their reserved stock.

-- ---------- Enumerated types -----------------------------------------
-- A new enum value can't be used in the same transaction that adds it, and
-- nothing below uses it: the API sets EXPIRED at runtime.
ALTER TYPE "pickup_status" ADD VALUE 'EXPIRED';

-- ---------- Order pickup schedule ------------------------------------
ALTER TABLE "orders" ADD COLUMN "ready_at"   timestamptz;
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamptz;

UPDATE "orders" SET "ready_at" = "created_at" + interval '15 minutes';

UPDATE "orders" SET "expires_at" = CASE
  WHEN (((("ready_at" AT TIME ZONE 'America/Sao_Paulo')::date) + time '19:00')
          AT TIME ZONE 'America/Sao_Paulo') > "ready_at"
    THEN ((("ready_at" AT TIME ZONE 'America/Sao_Paulo')::date) + time '19:00')
          AT TIME ZONE 'America/Sao_Paulo'
  ELSE (((("ready_at" AT TIME ZONE 'America/Sao_Paulo')::date) + 1) + time '19:00')
          AT TIME ZONE 'America/Sao_Paulo'
END;

ALTER TABLE "orders" ALTER COLUMN "ready_at"   SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "expires_at" SET NOT NULL;

ALTER TABLE "orders" ADD CONSTRAINT "orders_ready_after_created"        -- BR-12
  CHECK (ready_at >= created_at);
ALTER TABLE "orders" ADD CONSTRAINT "orders_expires_after_ready"        -- BR-20
  CHECK (expires_at > ready_at);

CREATE INDEX "orders_status_expires_at_idx" ON "orders"("pickup_status", "expires_at");
