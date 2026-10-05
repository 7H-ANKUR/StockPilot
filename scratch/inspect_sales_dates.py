import sqlite3

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

cur.execute("SELECT saleTimestamp, sourceDataset, paymentType, netSales FROM Sale WHERE typeof(saleTimestamp) = 'integer' LIMIT 10")
print('Integer timestamps sample:', cur.fetchall())

cur.execute("SELECT saleTimestamp, sourceDataset, paymentType, netSales FROM Sale WHERE typeof(saleTimestamp) = 'text' ORDER BY saleTimestamp DESC LIMIT 10")
print('Latest text timestamps sample:', cur.fetchall())

cur.execute("SELECT saleTimestamp, sourceDataset, paymentType, netSales FROM Sale WHERE typeof(saleTimestamp) = 'text' ORDER BY saleTimestamp ASC LIMIT 10")
print('Earliest text timestamps sample:', cur.fetchall())

cur.execute("SELECT DISTINCT sourceDataset, typeof(saleTimestamp), COUNT(*) FROM Sale GROUP BY sourceDataset, typeof(saleTimestamp)")
print('Breakdown by dataset and type:', cur.fetchall())

conn.close()
