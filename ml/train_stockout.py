import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
import joblib

def run_stockout_pipeline():
    print("Loading enriched dataset for stockout modeling...")
    df = pd.read_parquet("data/enriched/ml_daily_panel.parquet")
    
    # Feature Engineering for Stockouts
    df['rolling_demand_7'] = df.groupby(['sku', 'region'])['sales_qty'].transform(lambda x: x.rolling(7).mean())
    df['stock_cover_ratio'] = df['closing_stock'] / (df['rolling_demand_7'] + 1e-5)
    
    # Target: stockout_within_7d
    df['stockout_within_7d'] = df.groupby(['sku', 'region'])['stockout_flag'].transform(
        lambda x: x.rolling(7, min_periods=1).max().shift(-7)
    )
    
    df = df.dropna(subset=['rolling_demand_7', 'stockout_within_7d'])
    
    # Chronological Split
    max_date = df['date'].max()
    train_end = max_date - pd.Timedelta(days=60)
    val_end = max_date - pd.Timedelta(days=30)
    
    train_df = df[df['date'] <= train_end]
    val_df = df[(df['date'] > train_end) & (df['date'] <= val_end)]
    
    features = ['closing_stock', 'rolling_demand_7', 'stock_cover_ratio', 'on_order_qty']
    target = 'stockout_within_7d'
    
    X_train, y_train = train_df[features], train_df[target]
    X_val, y_val = val_df[features], val_df[target]
    
    print("Training RandomForest Classifier for Stockout Risk...")
    model = RandomForestClassifier(n_estimators=30, max_depth=10, random_state=42, class_weight='balanced')
    model.fit(X_train, y_train)
    
    preds = model.predict(X_val)
    probs = model.predict_proba(X_val)[:, 1]
    
    print("\nStockout Model Evaluation:")
    print(f"Precision: {precision_score(y_val, preds):.2f}")
    print(f"Recall: {recall_score(y_val, preds):.2f}")
    print(f"F1 Score: {f1_score(y_val, preds):.2f}")
    print(f"ROC-AUC: {roc_auc_score(y_val, probs):.2f}")
    
    joblib.dump(model, "ml/stockout/best_stockout_model.joblib")
    print("Model saved to ml/stockout/best_stockout_model.joblib")

if __name__ == "__main__":
    run_stockout_pipeline()
