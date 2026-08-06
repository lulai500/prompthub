Slow query:

```sql
SELECT o.id, o.total, c.name,
       (SELECT COUNT(*) FROM order_items oi
        WHERE oi.order_id = o.id) AS item_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.created_at >= '2026-01-01'
ORDER BY o.total DESC
LIMIT 50;
```

## Diagnosis
- Correlated subquery `(SELECT COUNT(*) ...)` runs once per order row → **N+1 pattern**; gets slower as the table grows
- `c.created_at >=` has no index → full table scan
- `ORDER BY o.total DESC` triggers a filesort

**Optimized:**
```sql
SELECT o.id, o.total, c.name, oi.item_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN (SELECT order_id, COUNT(*) AS item_count
      FROM order_items GROUP BY order_id) oi ON oi.order_id = o.id
WHERE c.created_at >= '2026-01-01'
ORDER BY o.total DESC
LIMIT 50;
```

**Indexes to add:**
```sql
CREATE INDEX idx_customers_created_at ON customers (created_at);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_orders_total ON orders (total DESC);
```

**Verify:** run `EXPLAIN ANALYZE` before/after to confirm the subquery collapsed to one aggregate and the indexes are used.
