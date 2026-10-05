from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="StockPilot ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "forecasting_model_loaded": forecast_model is not None,
        "stockout_model_loaded": stockout_model is not None,
    }

# Load Models (lazy load in endpoints to ensure they exist, but global for perf)
forecast_model = None
stockout_model = None

try:
    forecast_model = joblib.load(os.path.join("..", "ml", "forecasting", "best_forecasting_model.joblib"))
except Exception as e:
    print(f"Warning: Forecasting model not found at startup: {e}")

try:
    stockout_model = joblib.load(os.path.join("..", "ml", "stockout", "best_stockout_model.joblib"))
except Exception as e:
    print(f"Warning: Stockout model not found at startup: {e}")

class DemandRequest(BaseModel):
    DayOfWeek: int
    Month: int
    IsWeekend: int
    lag_7: float
    lag_14: float
    rolling_mean_7: float
    is_festival: int

class StockoutRequest(BaseModel):
    closing_stock: float
    rolling_demand_7: float
    stock_cover_ratio: float
    on_order_qty: float

@app.post("/api/v1/predict/demand")
def predict_demand(req: DemandRequest):
    if not forecast_model:
        raise HTTPException(status_code=500, detail="Forecasting model not loaded")
    
    features = pd.DataFrame([{
        'DayOfWeek': req.DayOfWeek,
        'Month': req.Month,
        'IsWeekend': req.IsWeekend,
        'lag_7': req.lag_7,
        'lag_14': req.lag_14,
        'rolling_mean_7': req.rolling_mean_7,
        'is_festival': req.is_festival
    }])
    
    pred = forecast_model.predict(features)[0]
    return {"predictedQty": max(0.0, float(pred))}

@app.post("/api/v1/predict/stockout")
def predict_stockout(req: StockoutRequest):
    if not stockout_model:
        raise HTTPException(status_code=500, detail="Stockout model not loaded")
        
    features = pd.DataFrame([{
        'closing_stock': req.closing_stock,
        'rolling_demand_7': req.rolling_demand_7,
        'stock_cover_ratio': req.stock_cover_ratio,
        'on_order_qty': req.on_order_qty
    }])
    
    pred = stockout_model.predict(features)[0]
    prob = stockout_model.predict_proba(features)[0][1]
    
    return {
        "stockoutRisk": float(prob),
        "willStockout": bool(pred == 1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
