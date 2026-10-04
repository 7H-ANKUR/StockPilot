import os
import argparse
import pandas as pd
import numpy as np

def generate_holidays():
    holidays = pd.DataFrame([
        {'festival_name': 'Republic Day', 'date': '2026-01-26', 'importance': 'High'},
        {'festival_name': 'Holi', 'date': '2026-03-04', 'importance': 'High'},
        {'festival_name': 'Id-ul-Fitr', 'date': '2026-03-21', 'importance': 'High'},
        {'festival_name': 'Ram Navami', 'date': '2026-03-26', 'importance': 'Medium'},
        {'festival_name': 'Mahavir Jayanti', 'date': '2026-03-31', 'importance': 'Low'},
        {'festival_name': 'Good Friday', 'date': '2026-04-03', 'importance': 'Medium'},
        {'festival_name': 'Buddha Purnima', 'date': '2026-05-01', 'importance': 'Low'},
        {'festival_name': 'Bakrid', 'date': '2026-05-27', 'importance': 'Medium'},
        {'festival_name': 'Muharram', 'date': '2026-06-26', 'importance': 'Low'},
        {'festival_name': 'Independence Day', 'date': '2026-08-15', 'importance': 'High'},
        {'festival_name': 'Milad-un-Nabi', 'date': '2026-08-26', 'importance': 'Low'},
        {'festival_name': 'Janmashtami', 'date': '2026-09-04', 'importance': 'Medium'},
        {'festival_name': 'Gandhi Jayanti', 'date': '2026-10-02', 'importance': 'High'},
        {'festival_name': 'Dussehra', 'date': '2026-10-20', 'importance': 'High'},
        {'festival_name': 'Diwali', 'date': '2026-11-08', 'importance': 'Critical'},
        {'festival_name': 'Guru Nanak Birthday', 'date': '2026-11-24', 'importance': 'Medium'},
        {'festival_name': 'Christmas', 'date': '2026-12-25', 'importance': 'High'}
    ])
    holidays['date'] = pd.to_datetime(holidays['date'])
    return holidays

def main(seed):
    np.random.seed(seed)
    
    print("Loading base sales dataset (FMCG)...")
    dataset_path = os.path.join("datasets", "fmcg dataset.xlsx")
    df = pd.read_excel(dataset_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['sku', 'region', 'date'])
    
    # 1. Generate Synthetic Suppliers
    print("Generating suppliers...")
    unique_skus = df['sku'].unique()
    suppliers = pd.DataFrame({
        'supplier_id': [f"SUP_{i:03d}" for i in range(1, 11)],
        'supplier_name': [f"Supplier {i}" for i in range(1, 11)],
        'reliability_score': np.random.uniform(0.7, 0.99, 10),
        'base_lead_time_days': np.random.randint(3, 15, 10)
    })
    suppliers.to_csv("data/enriched/suppliers.csv", index=False)
    
    sku_supplier_map = {sku: np.random.choice(suppliers['supplier_id']) for sku in unique_skus}
    
    # 2. Simulate Inventory and Stockouts
    print("Simulating historical inventory & stockouts...")
    
    records = []
    
    # Process sequentially per SKU and Region
    for (sku, region), group in df.groupby(['sku', 'region']):
        group = group.copy().sort_values('date')
        
        current_stock = np.random.randint(50, 200) # Initial stock
        supplier_id = sku_supplier_map[sku]
        supplier_lt = suppliers.loc[suppliers['supplier_id'] == supplier_id, 'base_lead_time_days'].values[0]
        
        on_order_qty = 0
        days_to_delivery = 0
        
        for idx, row in group.iterrows():
            date = row['date']
            demand = row['units_sold']
            
            # Receive order if pending
            received_qty = 0
            opening_stock = current_stock
            if days_to_delivery == 1:
                received_qty = on_order_qty
                current_stock += received_qty
                on_order_qty = 0
                days_to_delivery = 0
            elif days_to_delivery > 1:
                days_to_delivery -= 1
            
            # Stockout logic
            sales_qty = min(demand, current_stock)
            stockout_flag = 1 if demand > current_stock else 0
            latent_demand = demand
            
            current_stock -= sales_qty
            closing_stock = current_stock
            
            # Reorder logic (simplified Periodic Review)
            if closing_stock < 50 and on_order_qty == 0:
                on_order_qty = np.random.randint(100, 300)
                days_to_delivery = supplier_lt
                
            records.append({
                'date': date,
                'sku': sku,
                'region': region,
                'opening_stock': opening_stock,
                'received_qty': received_qty,
                'sales_qty': sales_qty,
                'closing_stock': closing_stock,
                'on_order_qty': on_order_qty,
                'stockout_flag': stockout_flag,
                'latent_demand': latent_demand,
                'supplier_id': supplier_id
            })

    inventory_df = pd.DataFrame(records)
    
    # Merge holidays
    holidays = generate_holidays()
    inventory_df = pd.merge(inventory_df, holidays, on='date', how='left')
    inventory_df['is_festival'] = inventory_df['festival_name'].notnull().astype(int)
    inventory_df['source_type'] = 'SYNTHETIC_ENRICHED'
    
    out_path = os.path.join("data", "enriched", "ml_daily_panel.parquet")
    inventory_df.to_parquet(out_path, index=False)
    print(f"Generated unified ML dataset at {out_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    main(args.seed)
