import urllib.request
import urllib.parse
import json

base_url = "http://localhost:3001"

test_endpoints = [
    ("/api/v1/health", "GET", None),
    ("/api/v1/dashboard", "GET", None),
    ("/api/v1/dashboard/drilldown?metric=transactions&period=30d", "GET", None),
    ("/api/v1/dashboard/drilldown?metric=revenue&period=30d", "GET", None),
    ("/api/v1/dashboard/drilldown?metric=aov&period=30d", "GET", None),
    ("/api/v1/dashboard/drilldown?metric=stockouts", "GET", None),
    ("/api/v1/inventory/brands", "GET", None),
    ("/api/v1/inventory?brand=Amul", "GET", None),
    ("/api/v1/inventory?brand=Cadbury", "GET", None),
    ("/api/v1/inventory/risks", "GET", None),
    ("/api/v1/suppliers", "GET", None),
    ("/api/v1/purchase-orders", "GET", None),
    ("/api/v1/recommendations", "GET", None),
    ("/api/v1/festival/proactive-alerts?festivalName=Diwali", "GET", None),
    ("/api/v1/festivals/upcoming", "GET", None),
    ("/api/v1/products", "GET", None),
    ("/api/v1/gst/reports", "GET", None),
    ("/api/v1/sales/summary", "GET", None),
]

all_passed = True
for ep, method, data in test_endpoints:
    url = base_url + ep
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            content = resp.read().decode('utf-8')
            parsed = json.loads(content)
            if "error" in parsed:
                print(f"FAILED (error in body): {ep} -> {parsed.get('error')}")
                all_passed = False
            else:
                sample = str(list(parsed.keys()) if isinstance(parsed, dict) else len(parsed))
                print(f"OK ({status}): {ep} -> keys/len: {sample}")
    except Exception as e:
        print(f"ERROR: {ep} -> {e}")
        all_passed = False

# Also test python FastAPI backend
py_base = "http://127.0.0.1:8000"
for ep in ["/health", "/docs"]:
    try:
        with urllib.request.urlopen(py_base + ep, timeout=5) as resp:
            print(f"OK ({resp.status}): Python backend {ep}")
    except Exception as e:
        print(f"ERROR Python backend {ep} -> {e}")
        all_passed = False

# Test ML predictions
try:
    req = urllib.request.Request(f"{py_base}/api/v1/predict/demand", 
        data=json.dumps({'DayOfWeek': 1, 'Month': 10, 'IsWeekend': 0, 'lag_7': 12.0, 'lag_14': 10.0, 'rolling_mean_7': 11.5, 'is_festival': 1}).encode('utf-8'),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as res:
        print(f"OK ({res.status}): Python ML predict/demand -> {res.read().decode('utf-8')}")
except Exception as e:
    print(f"ERROR Python ML predict/demand -> {e}")
    all_passed = False

try:
    req = urllib.request.Request(f"{py_base}/api/v1/predict/stockout", 
        data=json.dumps({'closing_stock': 5.0, 'rolling_demand_7': 15.0, 'stock_cover_ratio': 0.33, 'on_order_qty': 0.0}).encode('utf-8'),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as res:
        print(f"OK ({res.status}): Python ML predict/stockout -> {res.read().decode('utf-8')}")
except Exception as e:
    print(f"ERROR Python ML predict/stockout -> {e}")
    all_passed = False

if all_passed:
    print("\n>>> ALL API ENDPOINTS & ML SERVICES PASSED WITH ZERO ERRORS! <<<")
else:
    print("\n>>> SOME ENDPOINTS HAD ERRORS! <<<")
