import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import os
import time

def evaluate_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    
    # WAPE (Weighted Absolute Percentage Error)
    sum_abs_err = np.sum(np.abs(y_true - y_pred))
    sum_actual = np.sum(np.abs(y_true))
    wape = (sum_abs_err / sum_actual) * 100 if sum_actual > 0 else 0
    
    return {"MAE": mae, "RMSE": rmse, "WAPE": wape}

def run_forecasting_pipeline():
    print("Loading enriched dataset...")
    df = pd.read_parquet("data/enriched/ml_daily_panel.parquet")
    
    # Feature Engineering
    print("Engineering features...")
    df['DayOfWeek'] = df['date'].dt.dayofweek
    df['Month'] = df['date'].dt.month
    df['IsWeekend'] = df['DayOfWeek'].isin([5, 6]).astype(int)
    
    # Lags
    df['lag_7'] = df.groupby(['sku', 'region'])['sales_qty'].shift(7)
    df['lag_14'] = df.groupby(['sku', 'region'])['sales_qty'].shift(14)
    df['rolling_mean_7'] = df.groupby(['sku', 'region'])['lag_7'].transform(lambda x: x.rolling(7).mean())
    
    # Target (Predict sales_qty 7 days from now)
    # Actually, standard forecasting is: predict `sales_qty` today using lags.
    df = df.dropna(subset=['lag_7', 'lag_14', 'rolling_mean_7'])
    
    # Time-based split (DO NOT RANDOM SHUFFLE)
    max_date = df['date'].max()
    train_end = max_date - pd.Timedelta(days=60)
    val_end = max_date - pd.Timedelta(days=30)
    
    train_df = df[df['date'] <= train_end]
    val_df = df[(df['date'] > train_end) & (df['date'] <= val_end)]
    test_df = df[df['date'] > val_end]
    
    features = ['DayOfWeek', 'Month', 'IsWeekend', 'lag_7', 'lag_14', 'rolling_mean_7', 'is_festival']
    target = 'sales_qty'
    
    X_train, y_train = train_df[features], train_df[target]
    X_val, y_val = val_df[features], val_df[target]
    X_test, y_test = test_df[features], test_df[target]
    
    models = {
        "Naive (Lag 7)": None,
        "Moving Average (Roll 7)": None,
        "Ridge": Ridge(),
        "Random Forest": RandomForestRegressor(n_estimators=50, random_state=42),
        "LightGBM": lgb.LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)
    }
    
    results = []
    best_model = None
    best_wape = float('inf')
    
    print("Training models...")
    for name, model in models.items():
        start_time = time.time()
        if name == "Naive (Lag 7)":
            preds = val_df['lag_7']
        elif name == "Moving Average (Roll 7)":
            preds = val_df['rolling_mean_7']
        else:
            model.fit(X_train, y_train)
            preds = model.predict(X_val)
            
        train_time = time.time() - start_time
        preds = np.clip(preds, 0, None)
        
        metrics = evaluate_metrics(y_val, preds)
        
        results.append({
            "Model": name,
            "MAE": round(metrics['MAE'], 2),
            "RMSE": round(metrics['RMSE'], 2),
            "WAPE": round(metrics['WAPE'], 2),
            "Train Time (s)": round(train_time, 2)
        })
        
        if metrics['WAPE'] < best_wape and model is not None:
            best_wape = metrics['WAPE']
            best_model = (name, model)
            
    results_df = pd.DataFrame(results)
    print("\nModel Evaluation Results:")
    print(results_df.to_markdown(index=False))
    
    with open("docs/MODEL_EVALUATION.md", "w") as f:
        f.write("# Model Evaluation Report\n\n")
        f.write(results_df.to_markdown(index=False))
        
    print(f"\nSaving best model: {best_model[0]}")
    joblib.dump(best_model[1], "ml/forecasting/best_forecasting_model.joblib")

if __name__ == "__main__":
    run_forecasting_pipeline()
