'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface InventoryItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  sellingPrice: number;
  mrp: number;
  gstRate: number;
  onHandQty: number;
  availableStock: number;
  reorderPoint: number;
  maxStock: number;
  daysOfInventory: number;
  riskLevel: string;
  stockoutProbability: number;
  forecastDailyDemand: number;
  movementClass: string;
  movementLabel: string;
  movementDescription: string;
  sparkline: number[];
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    params.set('limit', '100');
    const res = await fetch(`/api/v1/inventory?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setCategories(data.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  const filtered = useMemo(() => {
    if (riskFilter === 'all') return items;
    return items.filter(i => i.riskLevel === riskFilter);
  }, [items, riskFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      high: items.filter(i => i.riskLevel === 'HIGH' || i.riskLevel === 'CRITICAL').length,
      watch: items.filter(i => i.riskLevel === 'WATCH').length,
      safe: items.filter(i => i.riskLevel === 'SAFE').length,
    };
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total SKUs" value={stats.total} color="primary" />
        <StatCard label="High Risk" value={stats.high} color="destructive" />
        <StatCard label="Watch" value={stats.watch} color="warning" />
        <StatCard label="Safe" value={stats.safe} color="success" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="WATCH">Watch</SelectItem>
                <SelectItem value="SAFE">Safe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Inventory Snapshot
          </CardTitle>
          <CardDescription>
            Showing {filtered.length} of {items.length} SKUs · Latest snapshot per product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto -mx-6">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>SKU / Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Daily Demand</TableHead>
                    <TableHead className="text-center">Movement</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                    <TableHead className="text-right">14-day Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.category}</div>
                        <div className="text-xs text-muted-foreground">{item.subcategory}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-medium">{item.onHandQty.toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">RP: {item.reorderPoint?.toFixed(0) || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={
                          item.daysOfInventory > 60 ? 'text-warning' :
                          item.daysOfInventory < 7 ? 'text-destructive font-medium' :
                          ''
                        }>
                          {item.daysOfInventory > 900 ? '∞' : item.daysOfInventory.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {item.forecastDailyDemand.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            item.movementLabel === 'fast' ? 'bg-primary/10 text-primary border-primary/30' :
                            item.movementLabel === 'slow' ? 'bg-warning/10 text-warning border-warning/30' :
                            ''
                          }
                        >
                          {item.movementClass}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <RiskBadge level={item.riskLevel} probability={item.stockoutProbability} />
                      </TableCell>
                      <TableCell>
                        <div className="w-24 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={item.sparkline.map((v, i) => ({ i, v }))}>
                              <YAxis hide domain={['auto', 'auto']} />
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke="oklch(0.55 0.15 152)"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No items match your filters.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
          </div>
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${colorMap[color]}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ level, probability }: { level: string; probability: number }) {
  if (level === 'CRITICAL' || level === 'HIGH') {
    return (
      <Badge className="bg-destructive text-destructive-foreground">
        {level} ({(probability * 100).toFixed(0)}%)
      </Badge>
    );
  }
  if (level === 'WATCH') {
    return (
      <Badge className="bg-warning text-warning-foreground">
        WATCH ({(probability * 100).toFixed(0)}%)
      </Badge>
    );
  }
  return <Badge variant="outline" className="bg-success/10 text-success border-success/30">SAFE</Badge>;
}
