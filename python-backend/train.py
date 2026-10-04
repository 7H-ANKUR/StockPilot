import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib
import os
from sklearn.metrics import mean_absolute_error, mean_squared_error

DATASETS_DIR = r"..\datasets"
MODEL_PATH = "model.joblib"

def load_and_prep_data():
    print("Loading datasets...")
    # Load sales data
    supermart_df = pd.read_csv(os.path.join(DATASETS_DIR, "Supermart Grocery Sales - Retail Analytics Dataset.csv"))
    
    # Supermart data doesn't have explicit Product IDs, but it has Category and Sub Category
    # We will forecast demand at the (Category, Sub Category) level for this example
    supermart_df['Order Date'] = pd.to_datetime(supermart_df['Order Date'], format='%m-%d-%Y', errors='coerce')
    
    # Some rows might have DD-MM-YYYY format instead, handle fallback
    mask = supermart_df['Order Date'].isna()
    if mask.any():
        supermart_df.loc[mask, 'Order Date'] = pd.to_datetime(supermart_df.loc[mask, 'Order Date'], format='%d-%m-%Y', errors='coerce')

    # Drop invalid dates
    supermart_df = supermart_df.dropna(subset=['Order Date'])
    
    # Create a synthetic "Product" identifier from Category and SubCategory
    supermart_df['Product_ID'] = supermart_df['Category'] + "_" + supermart_df['Sub Category']
    supermart_df['Product_ID'] = supermart_df['Product_ID'].str.replace(' ', '_').str.upper()

    # Estimate Quantity sold (Sales / (Price-Discount estimate))
    # Or just use Sales as the target variable for simplicity if Quantity is missing
    # Let's assume we want to forecast Sales directly or estimate quantity
    # We'll forecast Sales revenue for now as it's cleaner
    supermart_df['Sales'] = pd.to_numeric(supermart_df['Sales'], errors='coerce').fillna(0)

    # Group by Date and Product_ID to get daily sales
    daily_sales = supermart_df.groupby(['Product_ID', 'Order Date'])['Sales'].sum().reset_index()
    daily_sales = daily_sales.rename(columns={'Order Date': 'Date', 'Sales': 'Daily_Sales'})
    daily_sales = daily_sales.sort_values(by=['Product_ID', 'Date'])

    return daily_sales

def create_features(df):
    print("Creating time-series features...")
    # Create lag features and rolling means
    df['DayOfWeek'] = df['Date'].dt.dayofweek
    df['Month'] = df['Date'].dt.month
    df['Day'] = df['Date'].dt.day
    df['IsWeekend'] = df['DayOfWeek'].isin([5, 6]).astype(int)

    # Lags (7, 14, 28 days)
    for lag in [7, 14, 28]:
        df[f'Lag_{lag}'] = df.groupby('Product_ID')['Daily_Sales'].shift(lag)
    
    # Rolling means
    for window in [7, 14]:
        df[f'RollMean_{window}'] = df.groupby('Product_ID')['Lag_7'].transform(lambda x: x.rolling(window).mean())
    
    # Drop NAs created by lags
    df = df.dropna().copy()
    
    # Encode Product_ID categorically for LightGBM
    df['Product_ID_cat'] = df['Product_ID'].astype('category')
    
    return df

def train_model():
    daily_sales = load_and_prep_data()
    df = create_features(daily_sales)

    if len(df) == 0:
        print("Not enough data to train after creating 28-day lags!")
        return

    # Train/Test Split (Time-based: last 30 days as test)
    max_date = df['Date'].max()
    train = df[df['Date'] <= max_date - pd.Timedelta(days=30)]
    test = df[df['Date'] > max_date - pd.Timedelta(days=30)]

    features = ['Product_ID_cat', 'DayOfWeek', 'Month', 'Day', 'IsWeekend', 'Lag_7', 'Lag_14', 'Lag_28', 'RollMean_7', 'RollMean_14']
    target = 'Daily_Sales'

    X_train, y_train = train[features], train[target]
    X_test, y_test = test[features], test[target]

    print(f"Training LightGBM model on {len(X_train)} samples...")
    model = lgb.LGBMRegressor(
        n_estimators=100,
        learning_rate=0.1,
        random_state=42
    )
    
    model.fit(X_train, y_train, categorical_feature=['Product_ID_cat'])

    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    print(f"Evaluation -> MAE: {mae:.2f}, RMSE: {rmse:.2f}")

    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
