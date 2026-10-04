import os
import pandas as pd
import json

DATASETS_DIR = r"..\datasets"

def inspect_datasets():
    report = []
    
    for root, _, files in os.walk(DATASETS_DIR):
        for file in files:
            if file.endswith('.csv') or file.endswith('.xlsx'):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, DATASETS_DIR)
                print(f"Inspecting {rel_path}...")
                
                try:
                    if file.endswith('.csv'):
                        df = pd.read_csv(file_path, low_memory=False)
                    else:
                        df = pd.read_excel(file_path)
                        
                    columns = list(df.columns)
                    dtypes = {k: str(v) for k, v in df.dtypes.items()}
                    missing = df.isnull().sum().to_dict()
                    total_missing = df.isnull().sum().sum()
                    missing_pct = (total_missing / (df.shape[0] * df.shape[1])) * 100 if df.shape[0] > 0 else 0
                    
                    report.append({
                        "filename": file,
                        "location": rel_path,
                        "rows": df.shape[0],
                        "columns": df.shape[1],
                        "column_names": columns,
                        "dtypes": dtypes,
                        "missing_values": missing,
                        "missing_percentage": round(missing_pct, 2),
                        "duplicates": int(df.duplicated().sum())
                    })
                except Exception as e:
                    print(f"Error reading {file}: {e}")
                    
    with open("data_inspection_report.json", "w") as f:
        json.dump(report, f, indent=4)
        
if __name__ == "__main__":
    inspect_datasets()
    print("Inspection complete. See data_inspection_report.json")
