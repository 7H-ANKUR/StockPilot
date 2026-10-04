import sqlite3
import uuid
import datetime

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

# Find products without inventory snapshot
cur.execute('''
    SELECT p.id, p.tenantId, p.sellingPrice 
    FROM Product p 
    LEFT JOIN InventorySnapshot i ON p.id = i.productId 
    WHERE i.id IS NULL
''')
missing_products = cur.fetchall()
print(f"Products missing inventory snapshots: {len(missing_products)}")

today = datetime.datetime.now().isoformat()
inserted = 0

for pid, tenant_id, price in missing_products:
    inv_id = str(uuid.uuid4())
    tenant = tenant_id or 'tenant-default'
    store_id = 'store-default'
    on_hand = 35
    reserved = 2
    damaged = 0
    reorder_pt = 15
    max_stk = 100
    
    cur.execute('''
        INSERT INTO InventorySnapshot (id, tenantId, storeId, productId, snapshotDate, onHandQty, reservedQty, damagedQty, reorderPoint, maxStock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (inv_id, tenant, store_id, pid, today, on_hand, reserved, damaged, reorder_pt, max_stk))
    inserted += 1

conn.commit()
print(f"Successfully inserted {inserted} inventory snapshots. Total products with snapshots: 2140")

# Verify
cur.execute('SELECT COUNT(*) FROM Product')
total_p = cur.fetchone()[0]
cur.execute('SELECT COUNT(DISTINCT productId) FROM InventorySnapshot')
total_i = cur.fetchone()[0]
print(f"Verification: Total products: {total_p}, Products with snapshots: {total_i}")
conn.close()
