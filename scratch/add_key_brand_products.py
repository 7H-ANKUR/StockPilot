import sqlite3
import uuid
import datetime

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

extra_products = [
    {
        'sku': 'OIL-PAR-001',
        'name': 'Parachute 100% Pure Coconut Oil Bottle 500ml',
        'brand': 'Parachute',
        'category': 'Personal Care',
        'subcategory': 'Hair Care',
        'unit': 'bottle',
        'gstRate': 18,
        'mrp': 210,
        'sellingPrice': 195,
        'stock': 48,
        'reorder': 15,
        'max': 120
    },
    {
        'sku': 'OIL-PAR-002',
        'name': 'Parachute Advansed Aloe Vera Enriched Coconut Hair Oil 250ml',
        'brand': 'Parachute',
        'category': 'Personal Care',
        'subcategory': 'Hair Care',
        'unit': 'bottle',
        'gstRate': 18,
        'mrp': 155,
        'sellingPrice': 140,
        'stock': 32,
        'reorder': 10,
        'max': 80
    },
    {
        'sku': 'KET-KIS-002',
        'name': 'Kissan Fresh Tomato Ketchup 1kg Pouch',
        'brand': 'Kissan',
        'category': 'Packaged Food',
        'subcategory': 'Sauces & Spreads',
        'unit': 'pouch',
        'gstRate': 12,
        'mrp': 140,
        'sellingPrice': 125,
        'stock': 55,
        'reorder': 20,
        'max': 150
    },
    {
        'sku': 'SNK-LAY-002',
        'name': "Lay's India's Magic Masala Potato Chips 50g",
        'brand': "Lay's",
        'category': 'Snacks & Beverages',
        'subcategory': 'Chips & Crisps',
        'unit': 'pack',
        'gstRate': 12,
        'mrp': 20,
        'sellingPrice': 20,
        'stock': 85,
        'reorder': 30,
        'max': 200
    },
    {
        'sku': 'SNK-LAY-003',
        'name': "Lay's Spanish Tomato Tango Potato Chips 50g",
        'brand': "Lay's",
        'category': 'Snacks & Beverages',
        'subcategory': 'Chips & Crisps',
        'unit': 'pack',
        'gstRate': 12,
        'mrp': 20,
        'sellingPrice': 20,
        'stock': 70,
        'reorder': 25,
        'max': 180
    },
    {
        'sku': 'SNK-KUR-002',
        'name': 'Kurkure Masala Munch Crispy Snack 85g',
        'brand': 'Kurkure',
        'category': 'Snacks & Beverages',
        'subcategory': 'Chips & Crisps',
        'unit': 'pack',
        'gstRate': 12,
        'mrp': 20,
        'sellingPrice': 20,
        'stock': 90,
        'reorder': 30,
        'max': 220
    },
    {
        'sku': 'SNK-BIK-002',
        'name': 'Bikano All in One Mixture Namkeen 400g',
        'brand': 'Bikano',
        'category': 'Snacks & Beverages',
        'subcategory': 'Namkeen & Savouries',
        'unit': 'pack',
        'gstRate': 12,
        'mrp': 110,
        'sellingPrice': 99,
        'stock': 40,
        'reorder': 15,
        'max': 100
    },
    {
        'sku': 'OIL-FOR-002',
        'name': 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        'brand': 'Fortune',
        'category': 'Staples & Grains',
        'subcategory': 'Edible Oils',
        'unit': 'pouch',
        'gstRate': 5,
        'mrp': 160,
        'sellingPrice': 148,
        'stock': 65,
        'reorder': 25,
        'max': 160
    },
    {
        'sku': 'STP-AAS-002',
        'name': 'Aashirvaad Superior MP Chakki Atta 5kg',
        'brand': 'Aashirvaad',
        'category': 'Staples & Grains',
        'subcategory': 'Atta & Flours',
        'unit': 'bag',
        'gstRate': 5,
        'mrp': 260,
        'sellingPrice': 245,
        'stock': 50,
        'reorder': 20,
        'max': 120
    }
]

today = datetime.datetime.now().isoformat()
added = 0

for item in extra_products:
    cur.execute('SELECT id FROM Product WHERE sku = ?', (item['sku'],))
    existing = cur.fetchone()
    if existing:
        continue
    
    prod_id = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO Product (id, tenantId, sku, name, brand, category, subcategory, unit, gstRate, mrp, sellingPrice, isActive, sourceDataset, createdAt)
        VALUES (?, 'tenant-default', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'indian-supermarket', ?)
    ''', (prod_id, item['sku'], item['name'], item['brand'], item['category'], item['subcategory'], item['unit'], item['gstRate'], item['mrp'], item['sellingPrice'], today))
    
    inv_id = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO InventorySnapshot (id, tenantId, storeId, productId, snapshotDate, onHandQty, reservedQty, damagedQty, reorderPoint, maxStock)
        VALUES (?, 'tenant-default', 'store-default', ?, ?, ?, 2, 0, ?, ?)
    ''', (inv_id, prod_id, today, item['stock'], item['reorder'], item['max']))
    added += 1

conn.commit()
print(f"Added {added} key brand products.")
conn.close()
