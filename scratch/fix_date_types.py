import sqlite3
import datetime

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

cur.execute("SELECT typeof(createdAt), COUNT(*) FROM Product GROUP BY typeof(createdAt)")
print('Product createdAt types:', cur.fetchall())

now_ms = int(datetime.datetime.now().timestamp() * 1000)

cur.execute("UPDATE InventorySnapshot SET snapshotDate = ?, createdAt = ? WHERE typeof(snapshotDate) = 'text' OR typeof(createdAt) = 'text'", (now_ms, now_ms))
print('InventorySnapshot updated:', cur.rowcount)

cur.execute("UPDATE Product SET createdAt = ? WHERE typeof(createdAt) = 'text'", (now_ms,))
print('Product updated:', cur.rowcount)

conn.commit()

cur.execute("SELECT typeof(snapshotDate), COUNT(*) FROM InventorySnapshot GROUP BY typeof(snapshotDate)")
print('InventorySnapshot types after:', cur.fetchall())

conn.close()
