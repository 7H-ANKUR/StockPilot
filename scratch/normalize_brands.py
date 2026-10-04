import sqlite3

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

cur.execute('UPDATE Product SET brand = ? WHERE brand = ? OR brand = ?', ('Cadbury', 'Cadbury Dairy Milk', 'Cadbury Fuse'))
print('Cadbury updated:', cur.rowcount)

cur.execute('UPDATE Product SET brand = ? WHERE brand LIKE ? OR brand LIKE ?', ('Nestlé', '%Nestl%', '%Nestle%'))
print('Nestle updated:', cur.rowcount)

cur.execute('UPDATE Product SET brand = ? WHERE brand = ?', ("Haldiram's", 'Haldirams'))
print('Haldiram updated:', cur.rowcount)

cur.execute('UPDATE Product SET brand = ? WHERE brand = ?', ('Lakmé', 'Lakme'))
print('Lakme updated:', cur.rowcount)

conn.commit()

# Check Cadbury products:
cur.execute('SELECT sku, name, brand FROM Product WHERE brand = ?', ('Cadbury',))
cadbury_prods = cur.fetchall()
print(f'Cadbury total products: {len(cadbury_prods)}')
for p in cadbury_prods[:5]:
    print(' ', p)

conn.close()
