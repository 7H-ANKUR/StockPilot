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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Search, Package, AlertTriangle, ArrowLeft, Building2, Store, ChevronRight,
  TrendingUp, CheckCircle2, ShieldAlert, Sparkles, Filter, Eye, Layers, BarChart2
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, AreaChart, Area, XAxis } from 'recharts';

interface BrandItem {
  name: string;
  count: number;
  categories: string[];
  totalCategories: number;
}

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
  daysOfInventory: number | null;
  forecastAvailable: boolean;
  riskLevel: string;
  stockoutProbability: number;
  forecastDailyDemand: number;
  movementClass: string;
  movementLabel: string;
  movementDescription: string;
  sparkline: number[];
}

// Brand color palette helper for realistic supermarket brand aesthetic
function getBrandStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cadbury')) {
    return { bg: 'bg-purple-900/20 text-purple-400 border-purple-800/40', avatar: 'bg-purple-700 text-white' };
  }
  if (lower.includes('amul')) {
    return { bg: 'bg-blue-900/20 text-blue-400 border-blue-800/40', avatar: 'bg-blue-600 text-white' };
  }
  if (lower.includes('nestle') || lower.includes('nestlé')) {
    return { bg: 'bg-red-900/20 text-red-400 border-red-800/40', avatar: 'bg-red-600 text-white' };
  }
  if (lower.includes('britannia')) {
    return { bg: 'bg-amber-900/20 text-amber-400 border-amber-800/40', avatar: 'bg-amber-600 text-white' };
  }
  if (lower.includes('parle')) {
    return { bg: 'bg-emerald-900/20 text-emerald-400 border-emerald-800/40', avatar: 'bg-emerald-600 text-white' };
  }
  if (lower.includes('haldiram')) {
    return { bg: 'bg-orange-900/20 text-orange-400 border-orange-800/40', avatar: 'bg-orange-600 text-white' };
  }
  if (lower.includes('kissan')) {
    return { bg: 'bg-rose-900/20 text-rose-400 border-rose-800/40', avatar: 'bg-rose-600 text-white' };
  }
  if (lower.includes('lay')) {
    return { bg: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/40', avatar: 'bg-yellow-600 text-white' };
  }
  if (lower.includes('kurkure')) {
    return { bg: 'bg-amber-900/20 text-amber-400 border-amber-800/40', avatar: 'bg-amber-700 text-white' };
  }
  if (lower.includes('tata')) {
    return { bg: 'bg-cyan-900/20 text-cyan-400 border-cyan-800/40', avatar: 'bg-cyan-700 text-white' };
  }
  if (lower.includes('dabur')) {
    return { bg: 'bg-green-900/20 text-green-400 border-green-800/40', avatar: 'bg-green-700 text-white' };
  }
  if (lower.includes('dove') || lower.includes('nivea')) {
    return { bg: 'bg-sky-900/20 text-sky-400 border-sky-800/40', avatar: 'bg-sky-600 text-white' };
  }
  if (lower.includes('gillette')) {
    return { bg: 'bg-slate-800/40 text-slate-300 border-slate-700/50', avatar: 'bg-slate-700 text-white' };
  }
  if (lower.includes('coca') || lower.includes('pepsi')) {
    return { bg: 'bg-red-900/20 text-red-400 border-red-800/40', avatar: 'bg-red-700 text-white' };
  }
  // Generic fallback based on char code
  const code = (name.charCodeAt(0) || 0) % 5;
  const palettes = [
    { bg: 'bg-blue-950/20 text-blue-400 border-blue-800/30', avatar: 'bg-blue-800 text-white' },
    { bg: 'bg-emerald-950/20 text-emerald-400 border-emerald-800/30', avatar: 'bg-emerald-800 text-white' },
    { bg: 'bg-purple-950/20 text-purple-400 border-purple-800/30', avatar: 'bg-purple-800 text-white' },
    { bg: 'bg-amber-950/20 text-amber-400 border-amber-800/30', avatar: 'bg-amber-800 text-white' },
    { bg: 'bg-rose-950/20 text-rose-400 border-rose-800/30', avatar: 'bg-rose-800 text-white' },
  ];
  return palettes[code];
}

const FEATURED_BRANDS = [
  'Cadbury', 'Amul', 'Nestlé', 'Britannia', 'Parle',
  "Haldiram's", 'Kissan', "Lay's", 'Dabur', 'Tata',
  'Aashirvaad', 'Fortune', 'Dove', 'Gillette', 'Parachute'
];

export function InventoryPage() {
  // Step 1: Selected company (null = browsing companies)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Brands list state
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [brandSearch, setBrandSearch] = useState('');
  const [brandSort, setBrandSort] = useState<'count' | 'alpha'>('count');
  const [visibleBrandLimit, setVisibleBrandLimit] = useState(36);

  // Products state for selected company
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // Step 3: Product details modal
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // 1. Fetch available brands on mount
  useEffect(() => {
    async function fetchBrands() {
      setLoadingBrands(true);
      try {
        const res = await fetch('/api/v1/inventory/brands');
        const data = await res.json();
        if (data.success && Array.isArray(data.brands)) {
          setBrands(data.brands);
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
      } finally {
        setLoadingBrands(false);
      }
    }
    fetchBrands();
  }, []);

  // 2. Fetch products whenever selectedBrand or filters change
  useEffect(() => {
    if (!selectedBrand) {
      setItems([]);
      return;
    }

    let isMounted = true;
    async function loadCompanyProducts() {
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        params.set('brand', selectedBrand!);
        if (productSearch.trim()) params.set('search', productSearch.trim());
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        params.set('limit', '250');

        const res = await fetch(`/api/v1/inventory?${params.toString()}`);
        const data = await res.json();
        if (isMounted) {
          setItems(data.items || []);
          if (data.categories) setCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to load company products:', err);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    }

    const timer = setTimeout(loadCompanyProducts, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedBrand, productSearch, categoryFilter]);

  // Filtered brands for Step 1
  const filteredBrands = useMemo(() => {
    let list = [...brands];
    if (brandSearch.trim()) {
      const q = brandSearch.toLowerCase().trim();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.categories.some(c => c.toLowerCase().includes(q))
      );
    }
    if (brandSort === 'count') {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [brands, brandSearch, brandSort]);

  // Filtered products for Step 2
  const filteredProducts = useMemo(() => {
    if (riskFilter === 'all') return items;
    return items.filter(i => i.riskLevel === riskFilter);
  }, [items, riskFilter]);

  // Overall catalog stats
  const catalogStats = useMemo(() => {
    const totalBrands = brands.length;
    const totalProducts = brands.reduce((s, b) => s + b.count, 0);
    return { totalBrands, totalProducts };
  }, [brands]);

  // Company-specific stats
  const companyStats = useMemo(() => {
    return {
      total: items.length,
      highRisk: items.filter(i => i.riskLevel === 'HIGH' || i.riskLevel === 'CRITICAL').length,
      watch: items.filter(i => i.riskLevel === 'WATCH').length,
      safe: items.filter(i => i.riskLevel === 'SAFE').length,
      totalStock: items.reduce((s, i) => s + i.onHandQty, 0),
    };
  }, [items]);

  // Handle clicking a company card
  const handleSelectCompany = (brandName: string) => {
    setSelectedBrand(brandName);
    setProductSearch('');
    setCategoryFilter('all');
    setRiskFilter('all');
  };

  // Handle going back to companies
  const handleBackToCompanies = () => {
    setSelectedBrand(null);
    setProductSearch('');
    setCategoryFilter('all');
    setRiskFilter('all');
    setSelectedProduct(null);
  };

  // =========================================================================
  // VIEW 1: STEP 1 — SELECT COMPANY / BRAND
  // =========================================================================
  if (!selectedBrand) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        {/* Header Hero Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Building2 className="w-3.5 h-3.5 mr-1" />
                  Product Catalog Browsing
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">Step 1 of 2</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
                Select a Company / Brand
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Choose a company or brand to inspect its products, inventory velocity, sales forecast, and stockout risk.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-lg border border-border/80 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Brands</div>
                <div className="text-xl font-bold tabular-nums text-foreground">
                  {catalogStats.totalBrands > 0 ? catalogStats.totalBrands.toLocaleString() : '...'}
                </div>
              </div>
              <div className="px-4 py-2.5 rounded-lg border border-border/80 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total Catalog SKUs</div>
                <div className="text-xl font-bold tabular-nums text-primary">
                  {catalogStats.totalProducts > 0 ? catalogStats.totalProducts.toLocaleString() : '...'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Pick Featured FMCG Brands */}
          <div className="mt-5 pt-4 border-t border-border/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Popular FMCG Companies:
            </div>
            <div className="flex flex-wrap gap-2">
              {FEATURED_BRANDS.map(brandName => {
                const brandData = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
                return (
                  <button
                    key={brandName}
                    onClick={() => handleSelectCompany(brandData ? brandData.name : brandName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-150 cursor-pointer shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary/70" />
                    <span>{brandName}</span>
                    {brandData && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full">
                        {brandData.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Company Search and Sort Bar */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search company or brand (e.g. Cadbury, Amul, Kissan, Nestlé, Britannia)..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={brandSort} onValueChange={(val: any) => setBrandSort(val)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Most Products First</SelectItem>
                    <SelectItem value="alpha">Alphabetical (A - Z)</SelectItem>
                  </SelectContent>
                </Select>

                {brandSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrandSearch('')}
                    className="text-xs whitespace-nowrap"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-sm font-medium text-muted-foreground">
              Showing {Math.min(visibleBrandLimit, filteredBrands.length)} of {filteredBrands.length} Companies
            </div>
            {brandSearch && (
              <Badge variant="outline" className="text-xs">
                Filter: "{brandSearch}"
              </Badge>
            )}
          </div>

          {loadingBrands ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse border border-border" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-base">No company found matching "{brandSearch}"</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching with another brand name or browse the popular FMCG brands list above.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setBrandSearch('')}
              >
                Reset Search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBrands.slice(0, visibleBrandLimit).map((brand) => {
                const style = getBrandStyle(brand.name);
                const initials = brand.name.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={brand.name}
                    onClick={() => handleSelectCompany(brand.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectCompany(brand.name);
                      }
                    }}
                    className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer bg-card hover:bg-card/90 hover:border-primary/60 hover:shadow-md ${style.bg}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs ${style.avatar}`}>
                          {initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                            {brand.name}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {brand.count} {brand.count === 1 ? 'Product' : 'Products'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>

                    {/* Category preview pills */}
                    {brand.categories.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
                        {brand.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] text-muted-foreground/90 bg-muted/60 px-2 py-0.5 rounded-md truncate max-w-[140px]"
                            title={cat}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Show more button if lots of brands */}
          {filteredBrands.length > visibleBrandLimit && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => setVisibleBrandLimit(prev => prev + 36)}
                className="gap-2"
              >
                <span>Load More Companies</span>
                <span className="text-xs text-muted-foreground">
                  ({filteredBrands.length - visibleBrandLimit} remaining)
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STEP 2 — PRODUCTS BELONGING TO SELECTED COMPANY
  // =========================================================================
  const brandVisual = getBrandStyle(selectedBrand);
  const brandInitials = selectedBrand.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Navigation & Company Header */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToCompanies}
              className="gap-1.5 hover:bg-muted font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Companies</span>
            </Button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${brandVisual.avatar}`}>
                {brandInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                    Active Company
                  </Badge>
                  <span className="text-xs text-muted-foreground">Single Brand Catalog</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Products from {selectedBrand}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="secondary" className="text-xs px-3 py-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
            </Badge>
          </div>
        </div>

        {/* Company Quick Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total SKUs</div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">{companyStats.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-xs text-destructive uppercase tracking-wider font-medium">High / Critical Risk</div>
            <div className="text-xl font-bold mt-0.5 tabular-nums text-destructive">{companyStats.highRisk}</div>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="text-xs text-warning uppercase tracking-wider font-medium">Watch Risk</div>
            <div className="text-xl font-bold mt-0.5 tabular-nums text-warning">{companyStats.watch}</div>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="text-xs text-success uppercase tracking-wider font-medium">Safe Stock Level</div>
            <div className="text-xl font-bold mt-0.5 tabular-nums text-success">{companyStats.safe}</div>
          </div>
        </div>
      </div>

      {/* Filters for Selected Company */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search within ${selectedBrand} (name, SKU, subcategory)...`}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories ({categories.length})</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Risk Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Statuses</SelectItem>
                <SelectItem value="HIGH">High Risk</SelectItem>
                <SelectItem value="WATCH">Watch</SelectItem>
                <SelectItem value="SAFE">Safe</SelectItem>
              </SelectContent>
            </Select>

            {(productSearch || categoryFilter !== 'all' || riskFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProductSearch('');
                  setCategoryFilter('all');
                  setRiskFilter('all');
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STEP 3 — Product Table (Preserving and enhancing all existing fields) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-primary" />
                <span>{selectedBrand.toUpperCase()} PRODUCT CATALOG</span>
              </CardTitle>
              <CardDescription>
                Showing {filteredProducts.length} of {items.length} products strictly belonging to {selectedBrand}
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground italic hidden sm:block">
              Click any product row for detailed inventory & demand breakdown
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-14">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-semibold text-sm">No products found for this query</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No items in {selectedBrand} matched your search or category filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setProductSearch('');
                  setCategoryFilter('all');
                  setRiskFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="max-h-[620px] overflow-y-auto -mx-6">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 border-b">
                  <TableRow>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Daily Demand</TableHead>
                    <TableHead className="text-center">Movement</TableHead>
                    <TableHead className="text-center">Stock Status</TableHead>
                    <TableHead className="text-right">14-Day Trend</TableHead>
                    <TableHead className="text-center w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((item) => (
                    <TableRow
                      key={item.productId}
                      onClick={() => setSelectedProduct(item)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      {/* Product Name & SKU */}
                      <TableCell>
                        <div className="font-medium text-sm text-foreground hover:text-primary transition-colors">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{item.sku}</span>
                          <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-sans text-muted-foreground">
                            {item.brand}
                          </span>
                        </div>
                      </TableCell>

                      {/* Category & Subcategory */}
                      <TableCell>
                        <div className="text-sm">{item.category}</div>
                        <div className="text-xs text-muted-foreground">{item.subcategory || '-'}</div>
                      </TableCell>

                      {/* Price (Selling Price & MRP) */}
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold text-sm">₹{item.sellingPrice.toFixed(2)}</div>
                        {item.mrp > item.sellingPrice && (
                          <div className="text-[11px] text-muted-foreground line-through">
                            ₹{item.mrp.toFixed(2)}
                          </div>
                        )}
                      </TableCell>

                      {/* Current Stock & Reorder Point */}
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold text-sm">{item.onHandQty.toFixed(0)} pcs</div>
                        <div className="text-xs text-muted-foreground">RP: {item.reorderPoint ? item.reorderPoint.toFixed(0) : '-'}</div>
                      </TableCell>

                      {/* Days of Inventory */}
                      <TableCell className="text-right tabular-nums">
                        {item.daysOfInventory === null ? (
                          <span className="text-muted-foreground italic text-xs">N/A</span>
                        ) : (
                          <span className={
                            item.daysOfInventory > 60 ? 'text-warning font-medium' :
                            item.daysOfInventory < 7 ? 'text-destructive font-semibold' :
                            'text-success font-medium'
                          }>
                            {item.daysOfInventory.toFixed(1)}d
                          </span>
                        )}
                      </TableCell>

                      {/* Daily Demand */}
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {item.forecastDailyDemand.toFixed(1)} /day
                      </TableCell>

                      {/* Movement */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            item.movementLabel === 'fast' ? 'bg-primary/10 text-primary border-primary/30 font-semibold' :
                            item.movementLabel === 'slow' ? 'bg-warning/10 text-warning border-warning/30' :
                            ''
                          }
                        >
                          {item.movementClass || 'STABLE'}
                        </Badge>
                      </TableCell>

                      {/* Stock Status / Risk */}
                      <TableCell className="text-center">
                        <RiskBadge level={item.riskLevel} probability={item.stockoutProbability} />
                      </TableCell>

                      {/* 14-day Trend Sparkline */}
                      <TableCell>
                        <div className="w-24 h-8 ml-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(item.sparkline || []).map((v, i) => ({ i, v }))}>
                              <YAxis hide domain={['auto', 'auto']} />
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke="oklch(0.55 0.15 152)"
                                strokeWidth={1.8}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(item);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =====================================================================
          STEP 3 MODAL: Comprehensive Product Inventory & Demand Inspector
         ===================================================================== */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {selectedProduct.brand}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">{selectedProduct.sku}</span>
              </div>
              <DialogTitle className="text-xl font-bold mt-1 text-foreground">
                {selectedProduct.name}
              </DialogTitle>
              <DialogDescription>
                Category: {selectedProduct.category} {selectedProduct.subcategory ? `· ${selectedProduct.subcategory}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Financial & Pricing Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Selling Price</div>
                  <div className="text-lg font-bold text-foreground">₹{selectedProduct.sellingPrice.toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="text-xs text-muted-foreground">MRP</div>
                  <div className="text-lg font-bold text-foreground">₹{selectedProduct.mrp.toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="text-xs text-muted-foreground">GST Rate</div>
                  <div className="text-lg font-bold text-foreground">{selectedProduct.gstRate}%</div>
                </div>
              </div>

              {/* Stock Inventory Details */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  Inventory & Stock Levels
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">On-Hand Stock</div>
                    <div className="text-lg font-bold text-foreground">{selectedProduct.onHandQty} pcs</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Available</div>
                    <div className="text-lg font-bold text-primary">{selectedProduct.availableStock} pcs</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Reorder Point</div>
                    <div className="text-lg font-bold text-foreground">{selectedProduct.reorderPoint || '-'}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Max Capacity</div>
                    <div className="text-lg font-bold text-foreground">{selectedProduct.maxStock || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Demand Forecasting & Velocity */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  Demand Velocity & Risk Analysis
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Daily Demand</div>
                    <div className="text-base font-bold text-foreground">{selectedProduct.forecastDailyDemand.toFixed(1)} /day</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Coverage Remaining</div>
                    <div className="text-base font-bold text-foreground">
                      {selectedProduct.daysOfInventory !== null ? `${selectedProduct.daysOfInventory.toFixed(1)} days` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Stockout Probability</div>
                    <div className="text-base font-bold text-foreground">{(selectedProduct.stockoutProbability * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* 14-day history chart */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5 font-medium">14-Day Sales Velocity:</div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(selectedProduct.sparkline || []).map((v, i) => ({ day: `Day ${i + 1}`, sales: v }))}>
                        <defs>
                          <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="oklch(0.55 0.15 152)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(val: any) => [`${val} units`, 'Sales']}
                        />
                        <Area type="monotone" dataKey="sales" stroke="oklch(0.55 0.15 152)" fillOpacity={1} fill="url(#detailGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Close Details
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RiskBadge({ level, probability }: { level: string; probability: number }) {
  if (level === 'CRITICAL' || level === 'HIGH') {
    return (
      <Badge className="bg-destructive text-destructive-foreground font-semibold">
        {level} ({(probability * 100).toFixed(0)}%)
      </Badge>
    );
  }
  if (level === 'WATCH') {
    return (
      <Badge className="bg-warning text-warning-foreground font-semibold">
        WATCH ({(probability * 100).toFixed(0)}%)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-medium">
      SAFE
    </Badge>
  );
}
