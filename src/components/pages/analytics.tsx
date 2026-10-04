'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, IndianRupee, TrendingUp } from 'lucide-react';

export function AnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/v1/sales/summary?days=${days}`)
      .then(r => r.json())
      .then(setData);
  }, [days]);

  if (!data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  const CHART_COLORS = [
    'oklch(0.55 0.15 152)', 'oklch(0.68 0.13 165)', 'oklch(0.78 0.12 145)',
    'oklch(0.45 0.10 152)', 'oklch(0.85 0.08 95)', 'oklch(0.65 0.13 220)',
  ];

  const fmtINR = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Revenue ({days}d)</div>
            <div className="text-2xl font-bold mt-1">{fmtINR(data.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Transactions</div>
            <div className="text-2xl font-bold mt-1">{data.transactions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Avg Order Value</div>
            <div className="text-2xl font-bold mt-1">{fmtINR(data.avgOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Units Sold</div>
            <div className="text-2xl font-bold mt-1">{data.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Days selector */}
      <div className="flex gap-2">
        {[7, 30, 90, 365].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-md text-sm ${
              days === d ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {d === 365 ? '1Y' : `${d}d`}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.dailySeries}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 152)" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <Tooltip
                  formatter={(v: any) => [fmtINR(v), 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.01 152)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.55 0.15 152)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              Revenue by Category
            </CardTitle>
            <CardDescription>Top 5 categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byCategory.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 152)" />
                <XAxis type="number" tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <Tooltip formatter={(v: any) => [fmtINR(v), 'Revenue']} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="oklch(0.55 0.15 152)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="w-4 h-4 text-primary" />
              Revenue by Region
            </CardTitle>
            <CardDescription>Top regions by sales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byRegion.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 152)" />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <Tooltip formatter={(v: any) => [fmtINR(v), 'Revenue']} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="oklch(0.68 0.13 165)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Products
            </CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 152)" />
                <XAxis type="number" tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 152)" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} stroke="oklch(0.55 0.02 152)" />
                <Tooltip formatter={(v: any) => [fmtINR(v), 'Revenue']} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="oklch(0.78 0.12 145)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
