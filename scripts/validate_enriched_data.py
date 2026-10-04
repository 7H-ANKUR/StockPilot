import pandas as pd
import sys

def validate():
    print("Validating Enriched ML Dataset...\n")
    try:
        df = pd.read_parquet("data/enriched/ml_daily_panel.parquet")
    except Exception as e:
        print(f"Failed to load dataset: {e}")
        sys.exit(1)
        
    print(f"Total Rows: {len(df)}")
    print(f"Date Range: {df['date'].min()} to {df['date'].max()}")
    print(f"Unique SKUs: {df['sku'].nunique()}")
    
    # 1. Null Checks
    null_cols = df.isnull().sum()
    null_cols = null_cols[null_cols > 0]
    if len(null_cols) > 0:
        print("\nWARNING: Found missing values in generated dataset:")
        print(null_cols)
    else:
        print("\n[OK] Zero missing values detected.")
        
    # 2. Inventory Consistency
    if (df['closing_stock'] < 0).any():
        print("❌ ERROR: Found negative closing stock!")
        sys.exit(1)
    else:
        print("✅ No negative inventory values.")
        
    if (df['sales_qty'] > df['opening_stock'] + df['received_qty']).any():
        print("[FAIL] ERROR: Sales quantity exceeded available stock!")
        sys.exit(1)
    else:
        print("[OK] Sales bounded by physical availability.")
        
    # 3. Stockout Logic
    stockouts = df[df['stockout_flag'] == 1]
    valid_stockouts = stockouts[stockouts['closing_stock'] == 0]
    if len(stockouts) != len(valid_stockouts):
        print(f"[FAIL] ERROR: {len(stockouts) - len(valid_stockouts)} stockouts occurred with positive inventory!")
        sys.exit(1)
    else:
        print("[OK] Stockout causality holds (Stockout -> Closing Stock = 0).")
        
    print("\nValidation PASSED!")

if __name__ == "__main__":
    validate()
