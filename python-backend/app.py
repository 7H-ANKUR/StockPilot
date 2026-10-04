from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

app = FastAPI(title="Inventory Forecast ML API")

MODEL_PATH = "model.joblib"
model = None

try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Warning: Model not found at {MODEL_PATH}. Train the model first using train.py")

class ForecastRequest(BaseModel):
    product_id: str
    horizon_days: int = 7
    # In a real app, we'd pass recent historical sales to compute lags
    recent_sales: list[float]

@app.post("/api/v1/forecast")
def generate_forecast(req: ForecastRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded. Train the model first.")

    # Extremely basic mock feature generation for the inference
    # A robust implementation would query the DB for actual history
    today = datetime.now()
    predictions = []
    
    # We will simulate predictions for the requested horizon
    # using rolling auto-regressive prediction
    history = req.recent_sales.copy()
    
    for i in range(req.horizon_days):
        target_date = today + timedelta(days=i)
        
        # Calculate lags from history
        lag_7 = history[-7] if len(history) >= 7 else np.mean(history) if history else 0
        lag_14 = history[-14] if len(history) >= 14 else lag_7
        lag_28 = history[-28] if len(history) >= 28 else lag_14
        
        roll_7 = np.mean(history[-7:]) if len(history) >= 7 else lag_7
        roll_14 = np.mean(history[-14:]) if len(history) >= 14 else roll_7
        
        # Create single row dataframe matching training features
        # Note: LightGBM requires categorical types to match exactly, 
        # so we pass string and let it handle if configured, or just mock it safely.
        X = pd.DataFrame([{
            'Product_ID_cat': req.product_id,
            'DayOfWeek': target_date.weekday(),
            'Month': target_date.month,
            'Day': target_date.day,
            'IsWeekend': 1 if target_date.weekday() >= 5 else 0,
            'Lag_7': lag_7,
            'Lag_14': lag_14,
            'Lag_28': lag_28,
            'RollMean_7': roll_7,
            'RollMean_14': roll_14
        }])
        
        # Ensure categorical type
        X['Product_ID_cat'] = X['Product_ID_cat'].astype('category')
        
        try:
            pred = max(0, float(model.predict(X)[0]))
        except:
            # Fallback if product wasn't in training set categories
            pred = lag_7
            
        predictions.append(pred)
        history.append(pred) # Append prediction to history for next day's lag
        
    return {
        "product_id": req.product_id,
        "horizon_days": req.horizon_days,
        "predicted_qty": sum(predictions),
        "daily_predictions": predictions,
        "model": "LightGBM"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
