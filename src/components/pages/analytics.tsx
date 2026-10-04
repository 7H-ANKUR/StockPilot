'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar,
} from 'recharts';
import {
  BarChart3, IndianRupee, TrendingUp, Grid, Search,
  ShieldCheck, AlertTriangle, ArrowUpDown, Filter
} from 'lucide-react';
import { ProductDetailModal } from '@/components/product-detail-modal';
import { ExportButton } from '@/components/export-button';

export function AnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [days, setDays] = useState(30);

  // ABC-XYZ Matrix state
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/sales/summary?days=${days}`)
      .then(r => r.json())
      .then(setData);
  }, [days]);

  const loadMatrix = async () => {
    setMatrixLoading(true);
    try {
      const res = await fetch('/api/v1/analytics/abc-xyz?days=90');
      const json = await res.json();
      setMatrixData(json);
    } catch {
      // ignore
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const fmtINR = (n: number) => {
    if (!n) return '₹0';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  };

  if (!data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  // Filter products for ABC-XYZ
  const products = matrixData?.products || [];
  const categories = Array.from(new Set(products.map((p: any) => p.category))).filter(Boolean);

  const filteredProducts = products.filter((p: any) => {
    const matchesCell = !selectedCell || p.matrixClass === selectedCell;
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCell && matchesCategory && matchesSearch;
  });

  const getMatrixCellClass = (cell: string) => {
    const isSelected = selectedCell === cell;
    let base = 'p-3 rounded-lg border text-left transition-all cursor-pointer relative ';
    if (isSelected) {
      base += 'ring-2 ring-primary border-primary shadow-sm ';
    } else {
      base += 'hover:border-primary/50 hover:bg-muted/40 ';
    }

    if (cell === 'AX' || cell === 'BX') {
      return base + (isSelected ? 'bg-emerald-500/15' : 'bg-emerald-500/5 border-emerald-500/20');
    }
    if (cell === 'AY' || cell === 'BY' || cell === 'CX') {
      return base + (isSelected ? 'bg-blue-500/15' : 'bg-blue-500/5 border-blue-500/20');
    }
    if (cell === 'AZ') {
      return base + (isSelected ? 'bg-rose-500/20' : 'bg-rose-500/10 border-rose-500/30');
    }
    return base + (isSelected ? 'bg-muted' : 'bg-muted/30 border-border/80');
  };

  const getMatrixBadgeColor = (matrixClass: string) => {
    if (matrixClass === 'AX') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    if (matrixClass === 'AY') return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
    if (matrixClass === 'AZ') return 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold';
    if (matrixClass.startsWith('B')) return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="trends" className="text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Sales & Revenue Trends
            </TabsTrigger>
            <TabsTrigger value="matrix" className="text-xs">
              <Grid className="w-3.5 h-3.5 mr-1.5" />
              ABC / XYZ Inventory Matrix
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: SALES & REVENUE TRENDS                                */}
        {/* ============================================================ */}
        <TabsContent value="trends" className="space-y-4 mt-0">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase">Revenue ({days}d)</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{fmtINR(data.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase">Transactions</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{data.transactions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase">Avg Order Value</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{fmtINR(data.avgOrderValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase">Units Sold</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{data.totalQuantity.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Days selector */}
          <div className="flex gap-2">
            {[7, 30, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  days === d ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                }`}
              >
                {d === 365 ? '1 Year' : `${d} Days`}
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
                <CardDescription>Daily sales over selected period</CardDescription>
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
                <CardDescription>Top product categories</CardDescription>
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
                <CardDescription>Sales distribution by territory</CardDescription>
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
                  Top Products by Sales
                </CardTitle>
                <CardDescription>Highest revenue contributors</CardDescription>
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
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: ABC / XYZ INVENTORY MATRIX                            */}
        {/* ============================================================ */}
        <TabsContent value="matrix" className="space-y-6 mt-0">
          {/* Header Explanation */}
          <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">ABC / XYZ Demand & Value Matrix</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {matrixData?.summary?.totalProducts || 0} SKUs Analyzed
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">
                Categorizes inventory by <strong>Revenue Value (ABC)</strong> and <strong>Demand Predictability (XYZ)</strong>.
                Click on any cell below to filter matching products and view recommended inventory policies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton type="abc-xyz" label="Export Matrix (.xlsx)" />
              {selectedCell && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCell(null)}
                  className="text-xs shrink-0"
                >
                  Clear Filter ({selectedCell})
                </Button>
              )}
            </div>
          </div>

          {/* 3x3 Matrix Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>9-Cell Portfolio Matrix</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Total Portfolio Revenue: <strong className="text-foreground">{fmtINR(matrixData?.summary?.totalRevenue || 0)}</strong>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matrixLoading ? (
                <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
              ) : (
                <div className="space-y-2">
                  {/* Column headers (XYZ: Volatility) */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-muted-foreground pb-1">
                    <div className="text-left pl-2">Value \ Volatility</div>
                    <div>Class X (Steady, Low CV)</div>
                    <div>Class Y (Seasonal / Moderate)</div>
                    <div>Class Z (Erratic, Volatile)</div>
                  </div>

                  {/* Row A: High Value */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-3 rounded-lg bg-muted/40 flex flex-col justify-center text-xs">
                      <div className="font-bold text-foreground">Class A</div>
                      <div className="text-[11px] text-muted-foreground">Top ~80% Revenue</div>
                    </div>
                    {['AX', 'AY', 'AZ'].map(cell => {
                      const item = matrixData?.summary?.matrix?.[cell] || { count: 0, pctRevenue: 0 };
                      return (
                        <div
                          key={cell}
                          onClick={() => setSelectedCell(selectedCell === cell ? null : cell)}
                          className={getMatrixCellClass(cell)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm">{cell}</span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {item.pctRevenue}% Rev
                            </Badge>
                          </div>
                          <div className="text-xl font-bold mt-1">{item.count} <span className="text-xs font-normal text-muted-foreground">SKUs</span></div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {cell === 'AX' ? 'Auto Reorder (JIT)' : cell === 'AY' ? 'Festival Buffer' : 'Close Supervision'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Row B: Medium Value */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-3 rounded-lg bg-muted/40 flex flex-col justify-center text-xs">
                      <div className="font-bold text-foreground">Class B</div>
                      <div className="text-[11px] text-muted-foreground">Next ~15% Revenue</div>
                    </div>
                    {['BX', 'BY', 'BZ'].map(cell => {
                      const item = matrixData?.summary?.matrix?.[cell] || { count: 0, pctRevenue: 0 };
                      return (
                        <div
                          key={cell}
                          onClick={() => setSelectedCell(selectedCell === cell ? null : cell)}
                          className={getMatrixCellClass(cell)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm">{cell}</span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {item.pctRevenue}% Rev
                            </Badge>
                          </div>
                          <div className="text-xl font-bold mt-1">{item.count} <span className="text-xs font-normal text-muted-foreground">SKUs</span></div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {cell === 'BX' ? 'Batch Cycles' : cell === 'BY' ? 'Dynamic Safety' : 'Flexible Lead Time'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Row C: Low Value */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-3 rounded-lg bg-muted/40 flex flex-col justify-center text-xs">
                      <div className="font-bold text-foreground">Class C</div>
                      <div className="text-[11px] text-muted-foreground">Remaining ~5% Rev</div>
                    </div>
                    {['CX', 'CY', 'CZ'].map(cell => {
                      const item = matrixData?.summary?.matrix?.[cell] || { count: 0, pctRevenue: 0 };
                      return (
                        <div
                          key={cell}
                          onClick={() => setSelectedCell(selectedCell === cell ? null : cell)}
                          className={getMatrixCellClass(cell)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm">{cell}</span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {item.pctRevenue}% Rev
                            </Badge>
                          </div>
                          <div className="text-xl font-bold mt-1">{item.count} <span className="text-xs font-normal text-muted-foreground">SKUs</span></div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {cell === 'CX' ? 'Bulk / High MOQ' : cell === 'CY' ? 'Standard Order' : 'Order on Demand'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filtered Products Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>Classified SKU Inventory Policy</span>
                    {selectedCell && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        Filtered: {selectedCell}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Recommended reorder cadence and safety buffer policy tailored to each SKU.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search SKU or name…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c: any) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Product / SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue (90d)</TableHead>
                      <TableHead className="text-center">Demand Volatility (CV)</TableHead>
                      <TableHead className="text-center">Matrix Class</TableHead>
                      <TableHead>Recommended Inventory Policy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 50).map((p: any) => (
                      <TableRow
                        key={p.productId}
                        onClick={() => { setSelectedProductId(p.productId); setModalOpen(true); }}
                        className="cursor-pointer hover:bg-muted/60 transition-colors text-xs group"
                        title="Click to open full product deep-dive"
                      >
                        <TableCell>
                          <div className="font-semibold group-hover:text-primary transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {p.sku}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {p.category}
                        </TableCell>

                        <TableCell className="text-right font-mono font-medium">
                          ₹{p.revenue.toLocaleString('en-IN')}
                        </TableCell>

                        <TableCell className="text-center font-mono">
                          <span className={p.cv > 1.0 ? 'text-rose-500 font-semibold' : p.cv < 0.5 ? 'text-emerald-500' : 'text-muted-foreground'}>
                            {p.cv}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getMatrixBadgeColor(p.matrixClass)}`}>
                            {p.matrixClass}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-muted-foreground text-[11px] leading-relaxed max-w-xs">
                          {p.recommendedPolicy}
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                          No products found matching the selected matrix filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredProducts.length > 50 && (
                <div className="text-xs text-muted-foreground text-center pt-3">
                  Showing top 50 of {filteredProducts.length} items. Use search to refine.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
