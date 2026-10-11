-- Runs once when the `db` container's data volume is first created.
-- 06-development-workflow.md §1: local setup needs both cupcake_dev
-- (created by POSTGRES_DB) and cupcake_test (integration tests, 05-testing §2).
CREATE DATABASE cupcake_test OWNER cupcake;
