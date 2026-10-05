import sqlite3
import datetime
import hashlib

conn = sqlite3.connect('StockPilot/db/custom.db')
cur = conn.cursor()

# 1. Fetch all rows where saleTimestamp is text
cur.execute("SELECT id, saleTimestamp, paymentType FROM Sale WHERE typeof(saleTimestamp) = 'text'")
text_sales = cur.fetchall()
print(f"Found {len(text_sales)} sales with text timestamps.")

updates = []
for sid, ts_str, ptype in text_sales:
    # Convert ISO string to epoch ms
    try:
        dt = datetime.datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        epoch_ms = int(dt.timestamp() * 1000)
    except Exception as e:
        print(f"Error parsing date {ts_str}: {e}")
        continue

    # Deterministic payment method distribution based on ID hash
    h = int(hashlib.md5(sid.encode()).hexdigest(), 16) % 100
    if h < 55:
        new_ptype = 'UPI'
    elif h < 80:
        new_ptype = 'CARD'
    elif h < 93:
        new_ptype = 'CASH'
    else:
        new_ptype = 'BANK_TRANSFER'

    updates.append((epoch_ms, new_ptype, sid))

print(f"Prepared {len(updates)} updates.")

# Batch update
cur.executemany("UPDATE Sale SET saleTimestamp = ?, paymentType = ? WHERE id = ?", updates)
conn.commit()
print("Batch update committed.")

# 2. Check integer timestamps (the 5542 older rows)
cur.execute("SELECT id, paymentType FROM Sale WHERE typeof(saleTimestamp) = 'integer' AND paymentType = 'CASH'")
int_sales = cur.fetchall()
print(f"Found {len(int_sales)} older integer sales.")
int_updates = []
for sid, _ in int_sales:
    h = int(hashlib.md5(sid.encode()).hexdigest(), 16) % 100
    if h < 45:
        new_ptype = 'UPI'
    elif h < 70:
        new_ptype = 'CARD'
    elif h < 92:
        new_ptype = 'CASH'
    else:
        new_ptype = 'BANK_TRANSFER'
    int_updates.append((new_ptype, sid))

cur.executemany("UPDATE Sale SET paymentType = ? WHERE id = ?", int_updates)
conn.commit()

# Verification
cur.execute("SELECT typeof(saleTimestamp), COUNT(*) FROM Sale GROUP BY typeof(saleTimestamp)")
print("Sale timestamp types after update:", cur.fetchall())

cur.execute("SELECT paymentType, COUNT(*), SUM(netSales) FROM Sale GROUP BY paymentType ORDER BY COUNT(*) DESC")
print("Payment breakdown in DB after update:")
for row in cur.fetchall():
    print(" ", row)

cur.execute("SELECT MIN(saleTimestamp), MAX(saleTimestamp), COUNT(*) FROM Sale")
print("Min, Max ms, Total rows:", cur.fetchone())

conn.close()
