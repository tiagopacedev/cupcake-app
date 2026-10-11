\set ON_ERROR_STOP 0
\pset footer off
-- Seed catalog v2 (mirrors 03-data-model.md §8: six photographed products)
INSERT INTO categories (name, slug, sort_order) VALUES
 ('Clássicos','classics',1),('Chocolate','chocolate',2),('Frutados','fruity',3);
INSERT INTO tags (name, slug) VALUES ('Mais vendido','bestseller');
INSERT INTO products (category_id,name,slug,description,price_cents,stock_quantity,image_url)
SELECT c.id, p.name, p.slug, p.descr, p.price, p.stock, '/images/products/'||p.slug||'.jpg'
FROM (VALUES
 ('classics','Birthday Vanilla','birthday-vanilla','Baunilha · confeitos',990,40),
 ('classics','Red Velvet Classic','red-velvet-classic','Cacau · cream cheese',1290,25),
 ('chocolate','Chocolate Crush','chocolate-crush','Chocolate · ganache',1190,35),
 ('chocolate','Cookies & Cream','cookies-and-cream','Biscoito · creme',1290,3),
 ('fruity','Strawberry Kiss','strawberry-kiss','Morango · creme rosa',1190,30),
 ('fruity','Lemon Cream','lemon-cream','Limão siciliano · creme',1190,0)
) AS p(cat,name,slug,descr,price,stock) JOIN categories c ON c.slug=p.cat;
INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id FROM products p, tags t WHERE t.slug='bestseller'
AND p.slug IN ('birthday-vanilla','chocolate-crush','strawberry-kiss');

SELECT c.name category, count(*) products, sum(stock_quantity) stock FROM products p JOIN categories c ON c.id=p.category_id GROUP BY c.name, c.sort_order ORDER BY c.sort_order;
SELECT 'bestsellers' AS filter, string_agg(p.name, ', ' ORDER BY p.name) FROM products p JOIN product_tags pt ON pt.product_id=p.id;

\echo '--- order creation transaction (BR-10, BR-11, BR-15) ---'
BEGIN;
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE slug='birthday-vanilla' AND stock_quantity >= 1;
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE slug='chocolate-crush'  AND stock_quantity >= 2;
INSERT INTO customers (name, phone) VALUES ('Ana Souza','+5511912345678')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
INSERT INTO orders (code, customer_id, total_cents)
SELECT 'CUP-7K3Q9F', id, 2*1190+990 FROM customers WHERE phone='+5511912345678';
INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
SELECT o.id, p.id, q, p.price_cents FROM orders o,
 (VALUES ('chocolate-crush',2),('birthday-vanilla',1)) v(slug,q) JOIN products p ON p.slug=v.slug
WHERE o.code='CUP-7K3Q9F';
COMMIT;
SELECT code, pickup_status, total_cents, (created_at + interval '15 minutes') > created_at AS ready_at_derived FROM orders;
SELECT slug, stock_quantity FROM products WHERE slug IN ('chocolate-crush','birthday-vanilla') ORDER BY slug;
-- Customer reuse (BR-15): upsert by phone updates the name
INSERT INTO customers (name, phone) VALUES ('Ana S. Lima','+5511912345678')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now() RETURNING name;

\echo '--- conditional decrement on insufficient stock affects 0 rows (Cookies & Cream has 3) ---'
UPDATE products SET stock_quantity = stock_quantity - 5 WHERE slug='cookies-and-cream' AND stock_quantity >= 5;

\echo '--- each statement below MUST fail ---'
INSERT INTO customers (name, phone) VALUES ('Bruno','11912345678');                 -- 1 not E.164
INSERT INTO customers (name, phone) VALUES ('Bruno','+5511812345678');              -- 2 not mobile (9)
INSERT INTO customers (name, phone) VALUES ('B','+5521998765432');                  -- 3 name too short
UPDATE products SET stock_quantity = -1 WHERE slug='red-velvet-classic';           -- 4 negative stock
UPDATE products SET price_cents = 0 WHERE slug='red-velvet-classic';               -- 5 zero price
INSERT INTO orders (code, customer_id, total_cents) SELECT 'CUP-7K3Q9F', id, 990 FROM customers LIMIT 1;  -- 6 duplicate code
INSERT INTO orders (code, customer_id, total_cents) SELECT 'CUP-0OI1L2', id, 990 FROM customers LIMIT 1;  -- 7 ambiguous chars
INSERT INTO orders (code, customer_id, total_cents) SELECT 'CUP-AAAAAA', id, 0 FROM customers LIMIT 1;    -- 8 zero total
INSERT INTO orders (code, customer_id, total_cents, pickup_status) SELECT 'CUP-BBBBBB', id, 990, 'NOT_READY' FROM customers LIMIT 1; -- 9 removed status value
INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) SELECT o.id, p.id, 21, 1290 FROM orders o, products p WHERE o.code='CUP-7K3Q9F' AND p.slug='red-velvet-classic'; -- 10 qty > 20
INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) SELECT o.id, p.id, 1, 1190 FROM orders o, products p WHERE o.code='CUP-7K3Q9F' AND p.slug='chocolate-crush'; -- 11 duplicate line
DELETE FROM categories WHERE slug='classics';                                       -- 12 RESTRICT
DELETE FROM products WHERE slug='chocolate-crush';                                  -- 13 RESTRICT (ordered)
INSERT INTO categories (name, slug) VALUES ('Sem Açúcar','Sem Acucar');            -- 14 slug format
