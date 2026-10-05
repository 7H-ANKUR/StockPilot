'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  IndianRupee, ShoppingCart, TrendingUp, AlertTriangle, ArrowLeft,
  CreditCard, QrCode, Banknote, Building2, Search, CheckCircle2,
  Calendar, Layers, Package, ArrowUpRight, BarChart3, Filter
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export type DrilldownMetric = 'revenue' | 'transactions' | 'aov' | 'stockouts';
export type DatePeriod = 'today' | '7d' | '30d' | 'month' | 'year' | 'all';

interface DrilldownModalProps {
  open: boolean;
  onClose: () => void;
  metric: DrilldownMetric;
  onMetricChange: (m: DrilldownMetric) => void;
}

const DONUT_COLORS = [
  '#8b5cf6', // Violet for UPI
  '#3b82f6', // Blue for Card
  '#10b981', // Green for Cash
  '#f59e0b', // Amber for Bank Transfer
];

const PERIOD_LABELS: { id: DatePeriod; label: string }[] = [
  { id: 'today', label: 'Today (24h)' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

export function DashboardDrilldownModal({
  open,
  onClose,
  metric,
  onMetricChange,
}: DrilldownModalProps) {
  const [period, setPeriod] = useState<DatePeriod>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Stockout filters
  const [riskTypeFilter, setRiskTypeFilter] = useState<'ALL' | 'CRITICAL' | 'LOW_STOCK' | 'WATCH' | 'OVERSTOCK'>('ALL');
  const [stockSearch, setStockSearch] = useState('');

  // Currency helper
  const fmtINR = (n: number) => {
    if (n === undefined || n === null) return '₹0';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  const fmtNumber = (n: number) => {
    return (n || 0).toLocaleString();
  };

  // Fetch drilldown data whenever metric or period changes
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function fetchDrilldown() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('metric', metric);
        params.set('period', period);
        if (metric === 'stockouts') {
          if (riskTypeFilter !== 'ALL') params.set('riskType', riskTypeFilter);
          if (stockSearch.trim()) params.set('search', stockSearch.trim());
        }

        const res = await fetch(`/api/v1/dashboard/drilldown?${params.toString()}`);
        const resData = await res.json();
        if (isMounted) {
          setData(resData);
        }
      } catch (err) {
        console.error('Failed to load drilldown:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDrilldown();

    return () => {
      isMounted = false;
    };
  }, [open, metric, period, riskTypeFilter, stockSearch]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 border-border bg-card">
        {/* Header Bar */}
        <div className="p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="gap-1.5 hover:bg-muted font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-5 w-px bg-border hidden sm:block" />
              <div>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30 uppercase tracking-wider">
                  Live KPI Drill-Down
                </Badge>
                <DialogTitle className="text-xl font-bold mt-1 text-foreground">
                  {metric === 'transactions' && 'Transactions & Payment Breakdown'}
                  {metric === 'aov' && 'Average Order Value (AOV) Analytics'}
                  {metric === 'stockouts' && 'Inventory Stockout & Risk Monitor'}
                  {metric === 'revenue' && 'Total Revenue Performance & Analytics'}
                </DialogTitle>
              </div>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap gap-2 mt-5">
            <Button
              variant={metric === 'transactions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMetricChange('transactions')}
              className="gap-1.5 text-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Transactions ({data?.totalTransactions ? fmtNumber(data.totalTransactions) : '...'})
            </Button>
            <Button
              variant={metric === 'aov' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMetricChange('aov')}
              className="gap-1.5 text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Avg Order Value
            </Button>
            <Button
              variant={metric === 'stockouts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMetricChange('stockouts')}
              className="gap-1.5 text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Stockout Alerts
            </Button>
            <Button
              variant={metric === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMetricChange('revenue')}
              className="gap-1.5 text-xs"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              Total Revenue
            </Button>
          </div>

          {/* Date Period Filter Bar (for Transactions, AOV, and Revenue) */}
          {metric !== 'stockouts' && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date Range:
              </span>
              {PERIOD_LABELS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    period === p.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Unable to load details. Please try again.
            </div>
          ) : (
            <>
              {/* =============================================================
                  1. TRANSACTIONS VIEW
                  ============================================================= */}
              {metric === 'transactions' && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Top Stats Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Total Transactions ({period.toUpperCase()})
                      </div>
                      <div className="text-3xl font-extrabold mt-1 text-foreground tabular-nums">
                        {fmtNumber(data.totalTransactions)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Across all verified payment channels
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Total Payment Value
                      </div>
                      <div className="text-3xl font-extrabold mt-1 text-primary tabular-nums">
                        ₹{(data.totalPaymentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        UPI + Card + Cash + Bank Transfer
                      </div>
                    </div>
                  </div>

                  {/* 4 Summary Cards for Payment Methods */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Payment Method Breakdown
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(data.breakdown || []).map((b: any) => {
                        const icon =
                          b.key === 'UPI' ? <QrCode className="w-4 h-4 text-purple-400" /> :
                          b.key === 'CARD' ? <CreditCard className="w-4 h-4 text-blue-400" /> :
                          b.key === 'CASH' ? <Banknote className="w-4 h-4 text-emerald-400" /> :
                          <Building2 className="w-4 h-4 text-amber-400" />;

                        const cardBorder =
                          b.key === 'UPI' ? 'border-purple-800/30 bg-purple-950/10' :
                          b.key === 'CARD' ? 'border-blue-800/30 bg-blue-950/10' :
                          b.key === 'CASH' ? 'border-emerald-800/30 bg-emerald-950/10' :
                          'border-amber-800/30 bg-amber-950/10';

                        return (
                          <div key={b.key} className={`p-4 rounded-xl border ${cardBorder} shadow-2xs`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                {icon}
                                {b.method}
                              </span>
                              <Badge variant="outline" className="text-xs font-semibold tabular-nums">
                                {b.percentage}%
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold mt-2.5 text-foreground tabular-nums">
                              {fmtNumber(b.count)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Transactions
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-border/40 text-xs flex justify-between items-center font-medium">
                              <span className="text-muted-foreground">Volume:</span>
                              <span className="font-semibold text-foreground">₹{b.amount.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual Chart + Table Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Donut Chart */}
                    <div className="lg:col-span-5 p-4 rounded-xl border border-border bg-card flex flex-col justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Distribution Share
                      </div>
                      <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.breakdown || []}
                              dataKey="count"
                              nameKey="method"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={4}
                            >
                              {(data.breakdown || []).map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any, name: any) => [`${fmtNumber(value)} txs`, name]}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-[11px] text-center text-muted-foreground pt-2 border-t border-border/50">
                        Percentages based on {fmtNumber(data.totalTransactions)} completed sales
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="lg:col-span-7 rounded-xl border border-border overflow-hidden bg-card">
                      <div className="p-3.5 border-b border-border bg-muted/30">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Payment Channels Summary Table
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">% of Orders</TableHead>
                            <TableHead className="text-right">% of Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.breakdown || []).map((b: any) => (
                            <TableRow key={b.key}>
                              <TableCell className="font-semibold text-sm">
                                {b.method}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {fmtNumber(b.count)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">
                                {fmtINR(b.amount)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <Badge variant="outline" className="text-xs">
                                  {b.percentage}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {b.amountPercentage}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Recent Transactions List */}
                  {data.recentTransactions && data.recentTransactions.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Recent Verified POS Transactions ({data.recentTransactions.length} sample)
                        </div>
                        <span className="text-[11px] text-muted-foreground">Real POS ledger records</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date / Time</TableHead>
                            <TableHead>Product / Brand</TableHead>
                            <TableHead>Channel / Customer</TableHead>
                            <TableHead className="text-center">Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.recentTransactions.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs text-muted-foreground tabular-nums">
                                {new Date(tx.date).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="text-xs font-medium text-foreground">{tx.productName}</div>
                                <div className="text-[10px] text-muted-foreground">{tx.brand} · Qty: {tx.quantity}</div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tx.customerName}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {tx.paymentMethod}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-xs tabular-nums">
                                ₹{tx.amount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  2. AVG ORDER VALUE (AOV) VIEW
                  ============================================================= */}
              {metric === 'aov' && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Calculation Highlight Banner */}
                  <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-primary font-semibold">
                          Mathematical Formulation
                        </div>
                        <div className="text-sm font-medium text-foreground mt-0.5">
                          Average Order Value = Total Revenue ÷ Completed Transactions
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ₹{(data.totalRevenue || 0).toLocaleString('en-IN')} ÷ {fmtNumber(data.completedTransactions)} orders
                        </div>
                      </div>
                      <div className="text-right sm:border-l sm:border-primary/20 sm:pl-6">
                        <div className="text-xs text-muted-foreground">Calculated AOV ({period.toUpperCase()})</div>
                        <div className="text-3xl font-extrabold text-primary tabular-nums mt-0.5">
                          ₹{(data.avgOrderValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">Per completed transaction</div>
                      </div>
                    </div>
                  </div>

                  {/* Supporting Order Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Completed Orders</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">{fmtNumber(data.completedTransactions)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Valid sales only</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg Items / Order</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">{data.avgItemsPerOrder} units</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Basket depth</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Highest Order</div>
                      <div className="text-xl font-bold mt-1 text-success tabular-nums">{fmtINR(data.highestOrderValue)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Bulk / high-value purchase</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Lowest Order</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">₹{(data.lowestOrderValue || 0).toFixed(0)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Single candy/snack item</div>
                    </div>
                  </div>

                  {/* Order Size Distribution */}
                  <div className="rounded-xl border border-border p-5 bg-card">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Order Value Basket Distribution
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.distribution || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            formatter={(v: any) => [`${fmtNumber(v)} orders`, 'Volume']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="oklch(0.55 0.15 152)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown table */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order Value Tier</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                            <TableHead className="text-right">Revenue Contributed</TableHead>
                            <TableHead className="text-right">% of Total Orders</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.distribution || []).map((d: any) => (
                            <TableRow key={d.bucket}>
                              <TableCell className="font-medium text-xs">{d.bucket}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs">{fmtNumber(d.count)}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-semibold">{fmtINR(d.amount)}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                <Badge variant="outline" className="text-[10px]">{d.percentage}%</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  3. STOCKOUT ALERTS VIEW
                  ============================================================= */}
              {metric === 'stockouts' && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Category Summary Strips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setRiskTypeFilter('CRITICAL')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        riskTypeFilter === 'CRITICAL' ? 'border-destructive bg-destructive/15 ring-2 ring-destructive/30' : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-xs text-destructive uppercase tracking-wider font-semibold">Critical Stockout</div>
                      <div className="text-2xl font-bold mt-1 text-destructive tabular-nums">{data.counts?.critical || 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Out of stock / imminent</div>
                    </button>

                    <button
                      onClick={() => setRiskTypeFilter('LOW_STOCK')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        riskTypeFilter === 'LOW_STOCK' ? 'border-warning bg-warning/15 ring-2 ring-warning/30' : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-xs text-warning uppercase tracking-wider font-semibold">Low Stock</div>
                      <div className="text-2xl font-bold mt-1 text-warning tabular-nums">{data.counts?.lowStock || 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Below reorder level (RP)</div>
                    </button>

                    <button
                      onClick={() => setRiskTypeFilter('WATCH')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        riskTypeFilter === 'WATCH' ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/30' : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Watch List</div>
                      <div className="text-2xl font-bold mt-1 text-blue-400 tabular-nums">{data.counts?.watch || 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Approaching RP threshold</div>
                    </button>

                    <button
                      onClick={() => setRiskTypeFilter('OVERSTOCK')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        riskTypeFilter === 'OVERSTOCK' ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-500/30' : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-xs text-purple-400 uppercase tracking-wider font-semibold">Overstock</div>
                      <div className="text-2xl font-bold mt-1 text-purple-400 tabular-nums">{data.counts?.overstock || 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Excess holding inventory</div>
                    </button>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search at-risk product by name, brand, SKU..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className="pl-9 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={riskTypeFilter === 'ALL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRiskTypeFilter('ALL')}
                        className="text-xs"
                      >
                        All Alerts ({data.counts?.totalAlerts || 0})
                      </Button>
                      {riskTypeFilter !== 'ALL' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRiskTypeFilter('ALL')}
                          className="text-xs"
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Detailed Alert Items Table */}
                  <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Product / Brand</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Reorder Level</TableHead>
                          <TableHead className="text-right">Daily Sales</TableHead>
                          <TableHead className="text-right">Days Left</TableHead>
                          <TableHead className="text-center">Alert Status</TableHead>
                          <TableHead className="text-right">Recommended Reorder</TableHead>
                          <TableHead>Supplier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.items || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                              No items match this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (data.items || []).map((item: any) => {
                            const badgeClass =
                              item.severity === 'CRITICAL' ? 'bg-destructive text-destructive-foreground font-bold' :
                              item.severity === 'LOW_STOCK' ? 'bg-warning text-warning-foreground font-semibold' :
                              item.severity === 'WATCH' ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' :
                              'bg-purple-900/40 text-purple-300 border-purple-700/50';

                            return (
                              <TableRow key={item.productId} className="hover:bg-muted/40 transition-colors">
                                <TableCell>
                                  <div className="font-semibold text-xs text-foreground">{item.productName}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {item.sku} · <span className="font-sans font-medium text-foreground/80">{item.brand}</span>
                                  </div>
                                </TableCell>

                                <TableCell className="text-right tabular-nums font-bold text-xs">
                                  <span className={item.currentStock <= 0 ? 'text-destructive' : item.currentStock <= item.reorderLevel ? 'text-warning' : ''}>
                                    {item.currentStock} pcs
                                  </span>
                                </TableCell>

                                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                  {item.reorderLevel}
                                </TableCell>

                                <TableCell className="text-right tabular-nums text-xs">
                                  {item.dailySales} /d
                                </TableCell>

                                <TableCell className="text-right tabular-nums text-xs">
                                  {item.estimatedDaysRemaining === null ? (
                                    <span className="text-muted-foreground italic">N/A</span>
                                  ) : (
                                    <span className={item.estimatedDaysRemaining <= 3 ? 'text-destructive font-bold' : item.estimatedDaysRemaining <= 7 ? 'text-warning font-semibold' : ''}>
                                      {item.estimatedDaysRemaining}d
                                    </span>
                                  )}
                                </TableCell>

                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                                    {item.alertType}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-right tabular-nums text-xs font-semibold text-primary">
                                  {item.recommendedReorderQty > 0 ? `+${item.recommendedReorderQty} units` : 'None'}
                                </TableCell>

                                <TableCell className="text-xs text-muted-foreground">
                                  <div className="truncate max-w-[140px]" title={item.supplier}>{item.supplier}</div>
                                  <div className="text-[10px] text-muted-foreground">Lead: {item.leadTimeDays}d</div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* =============================================================
                  4. TOTAL REVENUE VIEW
                  ============================================================= */}
              {metric === 'revenue' && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Revenue Snapshot Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Selected Period</div>
                      <div className="text-xl font-bold mt-1 text-primary tabular-nums">{fmtINR(data.totalRevenue)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{period.toUpperCase()} Net Revenue</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Today / Last 24h</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">{fmtINR(data.revenueToday)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Daily run-rate</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">This Month</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">{fmtINR(data.revenueThisMonth)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Month to date</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-card">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">This Year</div>
                      <div className="text-xl font-bold mt-1 tabular-nums">{fmtINR(data.revenueThisYear)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Year to date</div>
                    </div>
                  </div>

                  {/* Top Categories & Top Products Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Top Categories */}
                    <div className="rounded-xl border border-border p-4 bg-card">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        Top Categories by Revenue
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.topCategories || []).map((c: any) => (
                            <TableRow key={c.category}>
                              <TableCell className="font-medium text-xs">{c.category}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-semibold">{fmtINR(c.revenue)}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                <Badge variant="outline" className="text-[10px]">{c.percentage}%</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Top Products */}
                    <div className="rounded-xl border border-border p-4 bg-card">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        Top Revenue Generating Products
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data.topProducts || []).map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                <div className="font-semibold text-xs truncate max-w-[170px]" title={p.name}>{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">{p.brand}</div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{fmtNumber(p.qty)}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-bold text-foreground">{fmtINR(p.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Calculated live from database transactions & inventory snapshots</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drilldown
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
