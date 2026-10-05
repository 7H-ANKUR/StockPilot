import urllib.request
import json

def test_endpoint(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    res = urllib.request.urlopen(req)
    return json.loads(res.read())

print("=== 1. DASHBOARD OVERVIEW API ===")
d = test_endpoint("http://localhost:3001/api/v1/dashboard")
kpis = d['kpis']
print(f"Total Revenue: Rs. {kpis['totalRevenue']:,.2f} (Last 30d: Rs. {kpis['revenue30d']:,.2f})")
print(f"Total Transactions: {kpis['totalTransactions']:,} (Last 30d: {kpis['transactions30d']:,})")
print(f"Avg Order Value: Rs. {kpis['avgOrderValue']:,.2f} (30d AOV: Rs. {kpis.get('avgOrderValue30d'):,.2f})")
print(f"Stockout Critical: {kpis['stockoutHigh']}, Low Stock: {kpis.get('stockoutLow')}")

print("\n=== 2. TRANSACTIONS DRILLDOWN (30d) ===")
tx30 = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=transactions&period=30d")
print(f"Total Transactions (30d): {tx30['totalTransactions']:,}")
print(f"Total Payment Value (30d): Rs. {tx30['totalPaymentValue']:,.2f}")
for b in tx30['breakdown']:
    print(f"  {b['method']:15s}: Count={b['count']:5d} ({b['percentage']}%), Amount=Rs. {b['amount']:11,.2f} ({b['amountPercentage']}%)")

print("\n=== 3. TRANSACTIONS DRILLDOWN (ALL-TIME) ===")
tx_all = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=transactions&period=all")
print(f"Total Transactions (All): {tx_all['totalTransactions']:,}")
print(f"Total Payment Value (All): Rs. {tx_all['totalPaymentValue']:,.2f}")
for b in tx_all['breakdown']:
    print(f"  {b['method']:15s}: Count={b['count']:5d} ({b['percentage']}%), Amount=Rs. {b['amount']:11,.2f} ({b['amountPercentage']}%)")

print("\n=== 4. AOV DRILLDOWN ===")
aov30 = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=aov&period=30d")
print(f"30d AOV: Rs. {aov30['avgOrderValue']:,.2f} = Rev Rs. {aov30['totalRevenue']:,.2f} / {aov30['completedTransactions']:,} orders")
print(f"    Min: Rs. {aov30['lowestOrderValue']}, Max: Rs. {aov30['highestOrderValue']:,.2f}, Avg Items: {aov30['avgItemsPerOrder']}")

aov_all = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=aov&period=all")
print(f"All AOV: Rs. {aov_all['avgOrderValue']:,.2f} = Rev Rs. {aov_all['totalRevenue']:,.2f} / {aov_all['completedTransactions']:,} orders")
print(f"    Min: Rs. {aov_all['lowestOrderValue']}, Max: Rs. {aov_all['highestOrderValue']:,.2f}, Avg Items: {aov_all['avgItemsPerOrder']}")

print("\n=== 5. STOCKOUT ALERTS DRILLDOWN ===")
stock = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=stockouts")
print(f"Counts: {stock['counts']}")
print("Sample Alert Items (First 5):")
for item in stock['items'][:5]:
    print(f"  [{item['alertType']}] {item['productName']} ({item['brand']})")
    print(f"    Stock: {item['currentStock']}, RP: {item['reorderLevel']}, DailySales: {item['dailySales']}, DaysLeft: {item['estimatedDaysRemaining']}, ReorderQty: {item['recommendedReorderQty']}, Supplier: {item['supplier']}")

print("\n=== 6. TOTAL REVENUE DRILLDOWN ===")
rev30 = test_endpoint("http://localhost:3001/api/v1/dashboard/drilldown?metric=revenue&period=30d")
print(f"30d Revenue: Rs. {rev30['totalRevenue']:,.2f}")
print(f"Today: Rs. {rev30['revenueToday']:,.2f}, This Month: Rs. {rev30['revenueThisMonth']:,.2f}, This Year: Rs. {rev30['revenueThisYear']:,.2f}")
print("Top Categories (first 3):", [c['category'] + f" ({c['percentage']}%)" for c in rev30['topCategories'][:3]])
print("Top Products (first 3):", [p['name'] + f" (Rs. {p['revenue']:,.0f})" for p in rev30['topProducts'][:3]])
