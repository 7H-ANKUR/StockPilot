'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';

interface RiskData {
  stockoutRisks: any[];
  overstockRisks: any[];
  summary: { totalStockoutHigh: number; totalOverstock: number };
}

export function RisksPage() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/inventory/risks')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="h-96 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-card-danger border-destructive/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-destructive uppercase tracking-wider">High Stockout</span>
            </div>
            <div className="text-2xl font-bold mt-1">{data?.summary.totalStockoutHigh || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card-warning border-warning/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium text-warning uppercase tracking-wider">Overstock</span>
            </div>
            <div className="text-2xl font-bold mt-1">{data?.summary.totalOverstock || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card-success border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Healthy Items</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {Math.max(0, 200 - (data?.summary.totalStockoutHigh || 0) - (data?.summary.totalOverstock || 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tracked</span>
            </div>
            <div className="text-2xl font-bold mt-1">200</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stockout risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Stockout Risk Items
            </CardTitle>
            <CardDescription>
              Computed via deterministic formula: LeadTimeDemand + SafetyStock vs AvailableStock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data?.stockoutRisks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No stockout risks detected.
                </div>
              ) : (
                data?.stockoutRisks.map((r, i) => (
                  <div key={i} className="p-3 rounded-md border border-border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.productName}</div>
                        <div className="text-xs text-muted-foreground">{r.sku}</div>
                      </div>
                      <Badge className={
                        r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-warning text-warning-foreground'
                      }>
                        {r.riskLevel}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Stock</div>
                        <div className="font-medium tabular-nums">{r.availableStock.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">LT Demand</div>
                        <div className="font-medium tabular-nums">{r.leadTimeDemand.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Coverage</div>
                        <div className="font-medium tabular-nums">{r.requiredCoverage.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Days Left</div>
                        <div className="font-medium tabular-nums text-destructive">
                          {r.expectedDaysToStockout === null ? 'N/A' : r.expectedDaysToStockout}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      {r.reason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overstock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <TrendingDown className="w-4 h-4" />
              Overstock Items
            </CardTitle>
            <CardDescription>
              Days of inventory exceeds threshold (30 days, 14 for perishables)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data?.overstockRisks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No overstock detected.
                </div>
              ) : (
                data?.overstockRisks.map((r, i) => (
                  <div key={i} className="p-3 rounded-md border border-border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.productName}</div>
                        <div className="text-xs text-muted-foreground">{r.sku}</div>
                      </div>
                      <Badge className={
                        r.classification === 'NO_DEMAND_SIGNAL' ? 'bg-muted text-muted-foreground' :
                        r.classification === 'VERY_SLOW' ? 'bg-warning/70 text-warning-foreground' :
                        'bg-warning text-warning-foreground'
                      }>
                        {r.classification || (r.daysOfInventory > 90 ? 'SEVERE' : 'OVERSTOCK')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Stock</div>
                        <div className="font-medium tabular-nums">{r.currentStock.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Daily Demand</div>
                        <div className="font-medium tabular-nums">
                          {r.forecastAvailable === false ? 'N/A' : r.forecastDailyDemand.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Days</div>
                        <div className="font-medium tabular-nums text-warning">
                          {r.daysOfInventory === null ? 'N/A' : r.daysOfInventory.toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Class</div>
                        <div className="font-medium">{r.movementClass}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      {r.recommendation}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
