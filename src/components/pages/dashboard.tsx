'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, AlertTriangle, Package, IndianRupee, ShoppingCart,
  Calendar, ArrowRight, Sparkles, AlertCircle, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { PageKey } from '@/app/page';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalTransactions: number;
    totalQuantity: number;
    revenue30d: number;
    transactions30d: number;
    avgOrderValue: number;
    stockoutHigh: number;
    stockoutWatch: number;
    overstock: number;
    pendingApprovals: number;
    approvedRecs: number;
    pendingReorderValue: number;
  };
  topMovers: { productId: string; name: string; sku: string; revenue: number; qty: number }[];
  stockoutRiskItems: any[];
  upcomingFestivals: any[];
  salesTrend: { date: string; revenue: number }[];
}

const CHART_COLORS = [
  'oklch(0.55 0.15 152)', // primary green
  'oklch(0.68 0.13 165)',
  'oklch(0.78 0.12 145)',
  'oklch(0.45 0.10 152)',
  'oklch(0.85 0.08 95)',
  'oklch(0.65 0.13 220)',
];

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/dashboard');
      const d = await res.json();
      setData(d);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateRecs = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/reorders/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      toast({
        title: 'Recommendations generated',
        description: `${d.count} new AI recommendations created. Review them in the Recommendations page.`,
      });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const k = data.kpis;
  const fmtINR = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={fmtINR(k.totalRevenue)}
          subtitle={`₹${(k.revenue30d / 1000).toFixed(1)}K in last 30 days`}
          icon={<IndianRupee className="w-5 h-5" />}
          gradient="bg-gradient-card-success"
        />
        <KpiCard
          title="Transactions"
          value={k.totalTransactions.toLocaleString()}
          subtitle={`${k.transactions30d} in last 30 days`}
          icon={<ShoppingCart className="w-5 h-5" />}
          gradient="bg-gradient-card-info"
        />
        <KpiCard
          title="Avg Order Value"
          value={fmtINR(k.avgOrderValue)}
          subtitle="Across all transactions"
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="bg-gradient-card-success"
        />
        <KpiCard
          title="Stockout Alerts"
          value={String(k.stockoutHigh)}
          subtitle={`${k.stockoutWatch} items on watch · ${k.overstock} overstock`}
          icon={<AlertTriangle className="w-5 h-5" />}
          gradient="bg-gradient-card-danger"
          alert={k.stockoutHigh > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 152)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.55 0.02 152)"
                />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.55 0.02 152)"
                />
                <Tooltip
                  formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.01 152)' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.55 0.15 152)"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top movers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Movers (30d)</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topMovers.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: CHART_COLORS[i] }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.qty} units</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{fmtINR(m.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stockout risks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Stockout Risk Alerts
              </CardTitle>
              <CardDescription>Items needing immediate attention</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('risks')}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.stockoutRiskItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No high-risk items detected. Generate recommendations to scan inventory.
                </div>
              ) : (
                data.stockoutRiskItems.slice(0, 5).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Badge
                      variant={r.riskLevel === 'CRITICAL' ? 'destructive' : 'default'}
                      className={
                        r.riskLevel === 'HIGH'
                          ? 'bg-destructive text-destructive-foreground'
                          : r.riskLevel === 'CRITICAL'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-warning text-warning-foreground'
                      }
                    >
                      {r.riskLevel}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.productName}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        Stock: {r.availableStock.toFixed(0)} · Lead-time demand: {r.leadTimeDemand.toFixed(1)} · Days: {r.expectedDaysToStockout}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-destructive">
                      {(r.stockoutProbability * 100).toFixed(0)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending approvals + Festival impact */}
        <div className="space-y-4">
          <Card className="bg-gradient-card-success border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="bg-background">
                  {k.pendingApprovals} pending
                </Badge>
              </div>
              <div className="text-2xl font-bold tabular-nums">{fmtINR(k.pendingReorderValue)}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending reorder value</div>
              <Button
                className="w-full mt-4"
                onClick={() => onNavigate('recommendations')}
              >
                Review Recommendations
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                Upcoming Festivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.upcomingFestivals.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(f.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {f.startDate !== f.endDate && ` - ${new Date(f.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(f.importance * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
                {data.upcomingFestivals.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No festivals in next 90 days
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Action banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Generate AI Reorder Recommendations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The agent will scan inventory, forecast demand, compute reorder quantities with MOQ and supplier constraints, and create explainable recommendations for manager approval.
            </p>
          </div>
          <Button
            onClick={generateRecs}
            disabled={generating}
            className="shrink-0"
          >
            {generating ? (
              <>
                <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" /> Generate Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title, value, subtitle, icon, gradient, alert,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient?: string;
  alert?: boolean;
}) {
  return (
    <Card className={`${gradient || ''} border-border`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${alert ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
            {icon}
          </div>
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-2">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
