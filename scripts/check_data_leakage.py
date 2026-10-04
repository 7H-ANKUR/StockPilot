import pandas as pd
import sys

def check_leakage():
    print("Auditing enriched ML dataset for data leakage...")
    
    try:
        df = pd.read_parquet("data/enriched/ml_daily_panel.parquet")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return
        
    # Check 1: Ensure closing_stock doesn't violate basic inventory equations
    # closing = opening + received - sales
    diff = df['closing_stock'] - (df['opening_stock'] + df['received_qty'] - df['sales_qty'])
    if not (diff == 0).all():
        print("ERROR: Inventory flow equation violated! Leakage or calculation error.")
        sys.exit(1)
        
    # Check 2: Ensure stockout flag isn't looking into the future
    # If stockout_flag is 1, closing_stock must be 0
    stockout_inconsistencies = df[(df['stockout_flag'] == 1) & (df['closing_stock'] > 0)]
    if len(stockout_inconsistencies) > 0:
        print(f"ERROR: Found {len(stockout_inconsistencies)} rows where stockout_flag=1 but closing_stock > 0.")
        sys.exit(1)
        
    # Check 3: Feature validation
    forbidden_features = ['future_demand_7d', 'stockout_within_3d']
    found_forbidden = [f for f in forbidden_features if f in df.columns]
    
    if found_forbidden:
        print(f"ERROR: Found forbidden future-looking features in the base dataset: {found_forbidden}")
        sys.exit(1)
        
    print("SUCCESS: No basic data leakage or temporal violations detected!")
    sys.exit(0)

if __name__ == "__main__":
    check_leakage()
