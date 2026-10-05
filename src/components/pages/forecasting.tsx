'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area,
} from 'recharts';
import { Brain, Sparkles, AlertCircle, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  hasSales?: boolean;
}

interface ForecastResult {
  productId: string;
  sku: string;
  productName: string;
  horizonDays: number;
  predictedQty: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  selectedModel: string;
  modelVersion: string;
  backtestMetrics?: {
    mae: number;
    rmse: number;
    wape: number;
    baselineMae: number;
    evaluationValid: boolean;
    evaluationNote?: string;
  };
  allModelMetrics?: Record<string, { mae: number; rmse: number; beatsBaseline: boolean; evaluationValid: boolean }>;
  historicalSeries?: { date: string; qty: number; netSales: number }[];
  forecastSeries?: { date: string; predictedQty: number; lowerBound: number; upperBound: number }[];
}

const modelDisplayNames: Record<string, string> = {
  naive: 'Naive Baseline (7-Day Avg)',
  ridge: 'Ridge Regression (L2 Regularized)',
  rf: 'Random Forest Regressor (Ensemble)',
  gb: 'Gradient Boosting Regressor',
  lightgbm: 'LightGBM (Local TS Engine)',
  Python_LightGBM: 'Python ML Engine (LightGBM)',
};

export function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [horizon, setHorizon] = useState(7);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/v1/products?limit=200&withSalesFirst=true')
      .then(r => r.json())
      .then(data => {
        const prodList = data.products || [];
        setProducts(prodList);
        if (prodList.length > 0) {
          // Default to first product that has sales, or fallback to first product
          const firstWithSales = prodList.find((p: Product) => p.hasSales);
          setSelectedProduct(firstWithSales ? firstWithSales.id : prodList[0].id);
        }
      });
  }, []);

  const runForecast = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setForecast(null);
    try {
      const res = await fetch('/api/v1/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct, horizonDays: horizon }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Forecast failed', description: data.error, variant: 'destructive' });
      } else {
        setForecast(data);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) runForecast();
  }, [selectedProduct, horizon]);

  const fmt = (n: number) => (n !== undefined && n !== null ? n.toFixed(1) : '0.0');

  // Prepare chart series combining historical sales + forecast trajectory
  const chartData = useMemo(() => {
    if (!forecast) return [];
    const hist = (forecast.historicalSeries || []).map(h => ({
      date: h.date.slice(5),
      actual: h.qty,
      forecast: null as number | null,
      lowerBound: null as number | null,
      upperBound: null as number | null,
    }));

    if (forecast.forecastSeries && forecast.forecastSeries.length > 0) {
      const fc = forecast.forecastSeries.map(f => ({
        date: f.date.slice(5),
        actual: null as number | null,
        forecast: f.predictedQty,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
      }));
      return [...hist, ...fc];
    }
    return hist;
  }, [forecast]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Demand Forecasting Engine (Layer 1 Intelligence)
          </CardTitle>
          <CardDescription>
            Multi-model demand forecasting trained with time-aware cross-validation.
            Features include 7/14/28d lags, rolling statistics, calendar seasonality, and festival flags.
            Validated against a baseline with champion model selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) {p.hasSales ? '• Active History' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(horizon)} onValueChange={(v) => setHorizon(parseInt(v))}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7-Day Horizon</SelectItem>
                <SelectItem value="14">14-Day Horizon</SelectItem>
                <SelectItem value="30">30-Day Horizon</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={runForecast} disabled={loading}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              {loading ? 'Forecasting...' : 'Run Forecast'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {forecast && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Forecast summary */}
            <Card className="lg:col-span-1 bg-gradient-card-success border-primary/20">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Predicted Demand · {forecast.horizonDays}d Horizon
                </div>
                <div className="text-4xl font-bold mt-2 tabular-nums text-foreground">
                  {fmt(forecast.predictedQty)}
                </div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">units expected</div>
                <div className="mt-5 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lower Bound (95% CI)</span>
                    <span className="tabular-nums font-semibold">{fmt(forecast.lowerBound)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Upper Bound (95% CI)</span>
                    <span className="tabular-nums font-semibold">{fmt(forecast.upperBound)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Forecast Confidence</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                      {(forecast.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Active Model</span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-muted">
                      {forecast.selectedModel}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backtest metrics */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Backtest Validation & Accuracy
                  </div>
                  {forecast.selectedModel && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      Champion: {forecast.selectedModel}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Time-aware split validation comparing candidate models against baseline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {forecast.backtestMetrics && forecast.backtestMetrics.evaluationValid ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <Metric
                        label="MAE"
                        value={fmt(forecast.backtestMetrics.mae)}
                        subtitle="Mean Abs Error"
                      />
                      <Metric
                        label="RMSE"
                        value={fmt(forecast.backtestMetrics.rmse)}
                        subtitle="Root Mean Sq Error"
                      />
                      <Metric
                        label="WAPE"
                        value={`${(forecast.backtestMetrics.wape * 100).toFixed(1)}%`}
                        subtitle="Weighted Abs % Error"
                      />
                      <Metric
                        label="Baseline MAE"
                        value={fmt(forecast.backtestMetrics.baselineMae)}
                        subtitle="Naive 7-day avg"
                        highlight={forecast.backtestMetrics.mae < forecast.backtestMetrics.baselineMae}
                      />
                    </div>
                    {forecast.backtestMetrics.evaluationNote && (
                      <div className="text-xs text-muted-foreground italic p-2 rounded bg-muted/30">
                        {forecast.backtestMetrics.evaluationNote}
                      </div>
                    )}
                  </>
                ) : forecast.backtestMetrics && !forecast.backtestMetrics.evaluationValid ? (
                  <div className="p-3.5 rounded-md bg-warning/10 border border-warning/30 mb-3">
                    <div className="flex items-center gap-2 text-warning font-medium text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Limited Historical Training Data
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {forecast.backtestMetrics.evaluationNote || 'Insufficient sales transactions to complete full backtest split. Local fallback / ML model active.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    Historical series being accumulated.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interactive Historical + Forecast Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Historical Sales & Future Demand Forecast Curve
                </CardTitle>
                <CardDescription>
                  Daily sales actuals (past 30 days) and projected demand trajectory with 95% confidence envelope.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        name="95% Confidence Upper"
                        fill="url(#forecastArea)"
                        stroke="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual Sales (Past 30d)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name={`Forecast (${forecast.horizonDays}d Projection)`}
                        stroke="#10b981"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#10b981' }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Progression Table */}
          {forecast.allModelMetrics && Object.keys(forecast.allModelMetrics).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Model Progression & Tournament Comparison
                </CardTitle>
                <CardDescription>
                  Progression order: Naive → Ridge → Random Forest → Gradient Boosting → LightGBM → Python ML Engine.
                  The model that achieves the lowest MAE and beats baseline is selected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Model Variant</th>
                        <th className="text-right py-2 px-3">MAE</th>
                        <th className="text-right py-2 px-3">RMSE</th>
                        <th className="text-center py-2 px-3">Beats Baseline</th>
                        <th className="text-center py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['naive', 'ridge', 'rf', 'gb', 'lightgbm', 'Python_LightGBM'].map((variant) => {
                        const m = forecast.allModelMetrics![variant];
                        if (!m) return null;
                        const isSelected = forecast.selectedModel === variant;
                        return (
                          <tr key={variant} className={`border-b transition-colors ${isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/30'}`}>
                            <td className="py-2.5 px-3 font-mono">
                              {modelDisplayNames[variant] || variant}
                            </td>
                            <td className="text-right py-2.5 px-3 tabular-nums font-semibold">
                              {m.evaluationValid ? m.mae.toFixed(3) : '—'}
                            </td>
                            <td className="text-right py-2.5 px-3 tabular-nums font-semibold">
                              {m.evaluationValid ? m.rmse.toFixed(3) : '—'}
                            </td>
                            <td className="text-center py-2.5 px-3">
                              {variant === 'naive' ? (
                                <span className="text-muted-foreground text-xs">Baseline Reference</span>
                              ) : m.evaluationValid ? (
                                m.beatsBaseline ? (
                                  <span className="text-success font-semibold">✓ Beats Baseline</span>
                                ) : (
                                  <span className="text-destructive font-semibold">✗ Below Baseline</span>
                                )
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </td>
                            <td className="text-center py-2.5 px-3">
                              {isSelected ? (
                                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                                  ● Champion (Active)
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!forecast && loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-sm font-medium text-muted-foreground">Running ML Tournament & Computing Forecast...</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, subtitle, highlight }: { label: string; value: string; subtitle?: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-md ${highlight ? 'bg-success/10 border border-success/30' : 'bg-muted/50'}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      {highlight && (
        <div className="text-xs text-success mt-1 font-medium">Beats baseline ✓</div>
      )}
    </div>
  );
}
