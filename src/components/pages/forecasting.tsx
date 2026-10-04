'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Brain, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
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
}

export function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [horizon, setHorizon] = useState(7);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [historical, setHistorical] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/v1/products?limit=200')
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        if (data.products?.length > 0) {
          setSelectedProduct(data.products[0].id);
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
      // Get historical series via sales summary (limited - we'll mock from forecast)
      // In production we'd have a /api/v1/products/[id]/sales endpoint
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) runForecast();
  }, [selectedProduct, horizon]);

  const fmt = (n: number) => n.toFixed(1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Demand Forecasting Engine
          </CardTitle>
          <CardDescription>
            Ridge regression model with lag features (1,3,7,14,28d), rolling mean (7,14,28d),
            weekday/month/week-of-year, trend, and stockout indicators.
            Validated against a naive baseline (recent 7-day avg).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(horizon)} onValueChange={(v) => setHorizon(parseInt(v))}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7-day</SelectItem>
                <SelectItem value="14">14-day</SelectItem>
                <SelectItem value="30">30-day</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={runForecast} disabled={loading}>
              <Sparkles className="w-4 h-4 mr-1" />
              {loading ? 'Forecasting...' : 'Run Forecast'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Forecast summary */}
          <Card className="lg:col-span-1 bg-gradient-card-success border-primary/20">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Predicted Demand · {forecast.horizonDays}d
              </div>
              <div className="text-4xl font-bold mt-2 tabular-nums">
                {fmt(forecast.predictedQty)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">units</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lower bound (95% CI)</span>
                  <span className="tabular-nums font-medium">{fmt(forecast.lowerBound)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Upper bound (95% CI)</span>
                  <span className="tabular-nums font-medium">{fmt(forecast.upperBound)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {(forecast.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="text-xs font-mono">{forecast.modelVersion}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backtest metrics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Backtest Metrics (Time-Aware Validation)
                {forecast.selectedModel && (
                  <Badge className="bg-primary text-primary-foreground">
                    Selected: {forecast.selectedModel}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                All 5 variants trained + backtested. Best model that beats naive baseline is selected.
                Per spec: "No model should be promoted unless it beats the baseline."
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecast.backtestMetrics && forecast.backtestMetrics.evaluationValid ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                    <div className="text-xs text-muted-foreground italic mb-4 p-2 rounded bg-muted/30">
                      {forecast.backtestMetrics.evaluationNote}
                    </div>
                  )}
                </>
              ) : forecast.backtestMetrics && !forecast.backtestMetrics.evaluationValid ? (
                <div className="p-4 rounded-md bg-warning/10 border border-warning/30 mb-4">
                  <div className="flex items-center gap-2 text-warning font-medium text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Evaluation Invalid
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {forecast.backtestMetrics.evaluationNote || 'All metrics are 0/0/0 — this is a failure to establish a valid evaluation, NOT an excellent result. Insufficient training data or constant target.'}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Not enough historical data to compute backtest metrics.
                </div>
              )}

              {/* All model variants comparison */}
              {forecast.allModelMetrics && Object.keys(forecast.allModelMetrics).length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Model Progression: Naive → Ridge → RF → GB → LightGBM
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Variant</th>
                          <th className="text-right py-2 px-2">MAE</th>
                          <th className="text-right py-2 px-2">RMSE</th>
                          <th className="text-center py-2 px-2">Beats Baseline</th>
                          <th className="text-center py-2 px-2">Selected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['naive', 'ridge', 'rf', 'gb', 'lightgbm'].map((variant) => {
                          const m = forecast.allModelMetrics![variant];
                          if (!m) return null;
                          const isSelected = forecast.selectedModel === variant;
                          return (
                            <tr key={variant} className={`border-b ${isSelected ? 'bg-primary/5' : ''}`}>
                              <td className="py-2 px-2 font-mono">{variant}</td>
                              <td className="text-right py-2 px-2 tabular-nums">
                                {m.evaluationValid ? m.mae.toFixed(3) : '—'}
                              </td>
                              <td className="text-right py-2 px-2 tabular-nums">
                                {m.evaluationValid ? m.rmse.toFixed(3) : '—'}
                              </td>
                              <td className="text-center py-2 px-2">
                                {variant === 'naive' ? (
                                  <span className="text-muted-foreground text-xs">baseline</span>
                                ) : m.evaluationValid ? (
                                  m.beatsBaseline ? (
                                    <span className="text-success">✓</span>
                                  ) : (
                                    <span className="text-destructive">✗</span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                )}
                              </td>
                              <td className="text-center py-2 px-2">
                                {isSelected && <span className="text-primary">●</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs">
                <strong>Why this matters:</strong> The model uses time-aware validation
                (no look-ahead leakage). Features include lag-1/3/7/14/28, rolling
                mean-7/14/28, rolling std, weekday, month, week-of-year, weekend flag,
                recent velocity, and 7-vs-28 day trend. <strong>0/0/0 metrics = evaluation failure, not excellence.</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!forecast && loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-sm text-muted-foreground">Computing forecast and backtest metrics...</div>
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
        <div className="text-xs text-success mt-1">Beats baseline ✓</div>
      )}
    </div>
  );
}
