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
import { TrendingUp, Brain, Sparkles } from 'lucide-react';
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
  modelVersion: string;
  backtestMetrics?: { mae: number; rmse: number; wape: number; baselineMae: number };
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
              <CardTitle className="text-base">Backtest Metrics (Time-Aware Validation)</CardTitle>
              <CardDescription>
                Compared against naive baseline (7-day rolling average × horizon).
                Model is only promoted if it beats baseline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecast.backtestMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Not enough historical data to compute backtest metrics.
                </div>
              )}
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs">
                <strong>Why this matters:</strong> The model uses time-aware validation
                (no look-ahead leakage). Features include lag-1/3/7/14/28, rolling
                mean-7/14/28, rolling std, weekday, month, week-of-year, weekend flag,
                recent velocity, and 7-vs-28 day trend.
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
