'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, TrendingUp, AlertTriangle, ShieldCheck, Truck,
  Sparkles, DollarSign, Calendar, RefreshCw, BarChart2
} from 'lucide-react';

interface ProductDetailProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (page: any) => void;
}

export function ProductDetailModal({
  productId,
  open,
  onOpenChange,
  onNavigate,
}: ProductDetailProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !open) return;
    setLoading(true);
    fetch(`/api/v1/products/${productId}`)
      .then(r => r.json())
      .then(res => {
        setData(res.product || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [productId, open]);

  if (!open) return null;

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'HIGH_RISK':
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">High Stockout Risk</Badge>;
      case 'WATCH':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Watch List</Badge>;
      case 'NORMAL':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Adequate Stock</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30">Stable</Badge>;
    }
  };

  const marginPct = data?.mrp && data?.sellingPrice 
    ? Math.round(((data.mrp - data.sellingPrice) / data.mrp) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <div className="text-sm text-muted-foreground">Loading product intelligence…</div>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-muted-foreground">Product not found.</div>
        ) : (
          <div>
            {/* Header banner */}
            <div className="p-5 border-b bg-muted/20">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground font-semibold uppercase">{data.sku}</span>
                      {getRiskBadge(data.stockoutRisk?.riskLevel)}
                    </div>
                    <DialogTitle className="text-lg font-bold mt-1 text-foreground leading-tight">
                      {data.name}
                    </DialogTitle>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {data.category} · {data.subcategory} {data.brand ? `· Brand: ${data.brand}` : ''}
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xl font-bold text-foreground">
                      ₹{data.sellingPrice?.toLocaleString('en-IN')}
                    </div>
                    {data.mrp > data.sellingPrice && (
                      <div className="text-xs text-muted-foreground">
                        MRP: <span className="line-through">₹{data.mrp}</span> ({marginPct}% discount)
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Fast KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                  <div className="text-[11px] text-muted-foreground">On-Hand Stock</div>
                  <div className="text-base font-bold mt-0.5">
                    {data.latestInventory?.onHandQty ?? 0} {data.unit || 'PCS'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                  <div className="text-[11px] text-muted-foreground">Days of Supply</div>
                  <div className="text-base font-bold mt-0.5 text-primary">
                    {data.stockoutRisk?.daysOfSupply !== undefined 
                      ? `${data.stockoutRisk.daysOfSupply.toFixed(1)}d` 
                      : '—'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                  <div className="text-[11px] text-muted-foreground">90d Total Sold</div>
                  <div className="text-base font-bold mt-0.5">
                    {data.stats90d?.totalSold ?? 0} units
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                  <div className="text-[11px] text-muted-foreground">90d Revenue</div>
                  <div className="text-base font-bold mt-0.5 text-emerald-600">
                    ₹{(data.stats90d?.totalRevenue ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Deep-Dive Tabs */}
            <div className="p-5">
              <Tabs defaultValue="forecast" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="forecast" className="text-xs">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    AI Demand Forecast
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="text-xs">
                    <Package className="w-3.5 h-3.5 mr-1.5" />
                    Stock & Risk
                  </TabsTrigger>
                  <TabsTrigger value="suppliers" className="text-xs">
                    <Truck className="w-3.5 h-3.5 mr-1.5" />
                    Suppliers & POs
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: AI Forecast & Sales */}
                <TabsContent value="forecast" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>14-Day Demand Projection</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                          {data.forecast?.selectedModel || 'Ridge ML'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {data.forecast?.predictedQty ?? Math.round((parseFloat(data.stats90d?.avgDailyDemand || '0') * 14))} units
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Estimated revenue: ₹{Math.round((data.forecast?.predictedQty || 0) * data.sellingPrice).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>Festival Demand Impact</span>
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {data.festivalImpact?.expectedUplift > 0 
                          ? `+${(data.festivalImpact.expectedUplift * 100).toFixed(0)}% festive surge` 
                          : 'Standard festive baseline'}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        {data.festivalImpact?.reason || 'Calculated using matched multi-year lunisolar sales windows.'}
                      </div>
                    </div>
                  </div>

                  {/* 30-Day Sales Trend Mini Chart */}
                  <div className="p-3.5 rounded-lg border space-y-2">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-primary" />
                        Recent Daily Sales Velocity (Last 30 Days)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Avg: {data.stats90d?.avgDailyDemand} units/day
                      </span>
                    </div>

                    {data.salesHistory && data.salesHistory.length > 0 ? (
                      <div className="h-28 flex items-end gap-1 pt-4 px-1">
                        {data.salesHistory.map((s: any, idx: number) => {
                          const maxQty = Math.max(...data.salesHistory.map((x: any) => x.qty), 1);
                          const heightPct = Math.min(100, Math.max(8, Math.round((s.qty / maxQty) * 100)));
                          return (
                            <div
                              key={idx}
                              className="flex-1 bg-primary/20 hover:bg-primary transition-all rounded-t-sm relative group cursor-pointer"
                              style={{ height: `${heightPct}%` }}
                              title={`${s.date}: ${s.qty} units`}
                            >
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex px-1.5 py-0.5 rounded bg-popover text-popover-foreground text-[10px] border shadow-sm whitespace-nowrap z-10">
                                {s.qty}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        No recent sales transaction records available for this SKU.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 2: Stock & Risk */}
                <TabsContent value="inventory" className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="text-[11px] text-muted-foreground">On-Hand Quantity</div>
                      <div className="text-lg font-bold">{data.latestInventory?.onHandQty ?? 0}</div>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="text-[11px] text-muted-foreground">Reorder Point</div>
                      <div className="text-lg font-bold text-amber-500">{data.latestInventory?.reorderPoint ?? 15}</div>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/20">
                      <div className="text-[11px] text-muted-foreground">Max Stock Capacity</div>
                      <div className="text-lg font-bold text-muted-foreground">{data.latestInventory?.maxStock ?? 100}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border space-y-2 text-xs">
                    <div className="font-semibold flex items-center gap-1.5 text-foreground">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Stockout Risk Analysis
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {data.stockoutRisk?.reason || 'Inventory coverage evaluated using lead-time demand, sales volatility, and festival calendar buffers.'}
                    </p>
                    {data.stockoutRisk?.recommendedOrderQty > 0 && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 font-medium text-xs mt-2">
                        Recommendation: Place purchase order for {data.stockoutRisk.recommendedOrderQty} units to restore coverage.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Suppliers & POs */}
                <TabsContent value="suppliers" className="space-y-3">
                  <div className="text-xs font-semibold">Associated Suppliers</div>
                  {data.supplierProducts && data.supplierProducts.length > 0 ? (
                    <div className="space-y-2">
                      {data.supplierProducts.map((sp: any) => (
                        <div
                          key={sp.id}
                          className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/40 transition-colors"
                        >
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              {sp.supplier?.name}
                              {sp.preferred && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                                  Preferred
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Lead Time: {sp.supplier?.leadTimeDays || 3} days · Min Order: {sp.supplier?.minOrderQty || 1} units
                            </div>
                          </div>
                          <div className="text-left sm:text-right font-mono">
                            <span className="text-muted-foreground text-[11px]">Cost: </span>
                            <span className="font-bold">₹{sp.unitCost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      No suppliers mapped to this SKU.
                    </div>
                  )}

                  {data.recommendations && data.recommendations.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold mb-2">Pending PO Recommendations</div>
                      {data.recommendations.map((rec: any) => (
                        <div key={rec.id} className="p-2.5 rounded-lg border bg-primary/5 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-medium">Order {rec.suggestedQty} units</div>
                            <div className="text-[11px] text-muted-foreground">Est. ₹{rec.estimatedCost?.toLocaleString('en-IN')}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Pending Review</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onNavigate('purchase-orders');
                  }}
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5" />
                  Go to Purchase Orders
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
