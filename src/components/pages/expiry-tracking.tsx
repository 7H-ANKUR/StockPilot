'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Sparkles, 
  Store as StoreIcon, 
  Package, 
  Search,
  Filter,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ExportButton } from '@/components/export-button';

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  batchValue: number;
  manufactureDate?: string;
  expiryDate: string;
  daysLeft: number;
  status: string;
  computedStatus: string;
  product: {
    id: string;
    sku: string;
    name: string;
    category?: string;
    sellingPrice?: number;
    unit?: string;
  };
  store: {
    id: string;
    code: string;
    name: string;
    city?: string;
  };
}

interface FefoProduct {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalStock: number;
  earliestExpiry: string;
  batches: Array<{
    batchId: string;
    batchNumber: string;
    storeName: string;
    quantity: number;
    costPrice: number;
    expiryDate: string;
    daysLeft: number;
    actionRecommendation: string;
  }>;
}

interface SummaryData {
  totalBatches: number;
  expired: { count: number; value: number };
  critical: { count: number; value: number };
  warning: { count: number; value: number };
  safe: { count: number; value: number };
}

export function ExpiryTrackingPage({ onSelectProduct }: { onSelectProduct?: (productId: string) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fefoQueue, setFefoQueue] = useState<FefoProduct[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New batch dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; sku: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    storeId: '',
    productId: '',
    batchNumber: '',
    quantity: 50,
    costPrice: 85,
    manufactureDate: '',
    expiryDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpiryData = async () => {
    try {
      setLoading(true);
      const [batchRes, alertRes] = await Promise.all([
        fetch(`/api/v1/inventory/batches?status=${statusFilter}`),
        fetch('/api/v1/inventory/expiry-alerts')
      ]);

      const batchData = await batchRes.json();
      const alertData = await alertRes.json();

      if (batchData.batches) setBatches(batchData.batches);
      if (alertData.summary) setSummary(alertData.summary);
      if (alertData.fefoQueue) setFefoQueue(alertData.fefoQueue);
    } catch (err) {
      console.error('Error fetching expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, [statusFilter]);

  // Load stores and products for batch creation
  useEffect(() => {
    fetch('/api/v1/transfers')
      .then(r => r.json())
      .then(d => {
        if (d.stores && d.stores.length > 0) {
          setStores(d.stores);
          setFormData(prev => ({ ...prev, storeId: d.stores[0].id }));
        }
      })
      .catch(() => {});

    fetch('/api/v1/inventory?limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.items && d.items.length > 0) {
          setAvailableProducts(d.items.map((i: any) => ({
            id: i.productId,
            sku: i.sku,
            name: i.name,
          })));
          setFormData(prev => ({ ...prev, productId: d.items[0].productId }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeId || !formData.productId || !formData.batchNumber || !formData.expiryDate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/inventory/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          storeId: stores[0]?.id || '',
          productId: availableProducts[0]?.id || '',
          batchNumber: '',
          quantity: 50,
          costPrice: 85,
          manufactureDate: '',
          expiryDate: '',
        });
        await fetchExpiryData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create batch');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      b.product?.name?.toLowerCase().includes(q) ||
      b.product?.sku?.toLowerCase().includes(q) ||
      b.product?.category?.toLowerCase().includes(q) ||
      b.store?.name?.toLowerCase().includes(q)
    );
  });

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-rose-400" />
            Expiry & Shelf-Life Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            FEFO (First-Expired, First-Out) tracking, write-off prevention, and automated retail clearance alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ExportButton type="expiry" label="Export Batches (.xlsx)" />
          <Button onClick={() => setIsAddOpen(true)} className="bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-lg shadow-rose-500/20">
            <Plus className="w-4 h-4" />
            Register New Batch
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-rose-950/20 border-rose-500/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-rose-300 font-medium">Expired (Write-off Loss)</p>
                <h3 className="text-xl font-bold text-rose-400 mt-0.5">{formatINR(summary.expired.value)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{summary.expired.count} batches</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-950/20 border-amber-500/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-amber-300 font-medium">Urgent Clearance (≤ 7 Days)</p>
                <h3 className="text-xl font-bold text-amber-400 mt-0.5">{formatINR(summary.critical.value)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{summary.critical.count} batches at risk</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-950/20 border-yellow-500/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-yellow-300 font-medium">Watchlist (8 - 30 Days)</p>
                <h3 className="text-xl font-bold text-yellow-400 mt-0.5">{formatINR(summary.warning.value)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{summary.warning.count} batches</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-950/20 border-emerald-500/30 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-300 font-medium">Safe Stock (&gt; 30 Days)</p>
                <h3 className="text-xl font-bold text-emerald-400 mt-0.5">{formatINR(summary.safe.value)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{summary.safe.count} batches</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FEFO Priority Clearance Queue */}
      {fefoQueue.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  FEFO Priority Clearance Action Queue
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/20">
                Immediate Store Action Required
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              These products have batches expiring within 14 days. Staff must rotate to front display or activate clearance discounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fefoQueue.map((item, idx) => {
                const earliest = item.batches[0];
                const isExpired = earliest.daysLeft < 0;
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-card/60 border border-border/70 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground line-clamp-1">{item.productName}</span>
                        <Badge className={isExpired ? "bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]" : "bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"}>
                          {isExpired ? 'Expired' : `${earliest.daysLeft}d Left`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{item.sku} • {item.category}</p>

                      <div className="mt-2.5 p-2 bg-background/50 rounded-lg border border-border/40 text-xs space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Batch:</span>
                          <span className="font-mono text-foreground">{earliest.batchNumber}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Expiring Units:</span>
                          <span className="font-semibold text-foreground">{earliest.quantity} units ({earliest.storeName.split('-')[0]})</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Expiry Date:</span>
                          <span className={isExpired ? "text-rose-400 font-semibold" : "text-amber-400 font-semibold"}>
                            {new Date(earliest.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20">
                        <Percent className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-medium line-clamp-1">{earliest.actionRecommendation}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-card/60 border border-border/60 rounded-xl overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: 'EXPIRING_SOON', label: 'Urgent (≤ 7 Days)' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'ACTIVE', label: 'Active (> 7 Days)' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search batch #, product, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card/50 border-border/60"
          />
        </div>
      </div>

      {/* Batches Table */}
      <Card className="bg-card/40 border-border/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-accent/30 text-muted-foreground font-medium border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Value (₹)</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Days Left</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Loading inventory batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No batches found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const isExpired = b.daysLeft < 0;
                  const isUrgent = b.daysLeft >= 0 && b.daysLeft <= 7;
                  const isWarning = b.daysLeft > 7 && b.daysLeft <= 30;

                  return (
                    <tr key={b.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {b.batchNumber}
                      </td>
                      <td className="py-3 px-4">
                        {onSelectProduct ? (
                          <button
                            type="button"
                            onClick={() => onSelectProduct(b.product.id)}
                            className="text-left font-medium text-foreground hover:text-indigo-400 hover:underline block"
                          >
                            {b.product.name}
                          </button>
                        ) : (
                          <span className="font-medium text-foreground">{b.product.name}</span>
                        )}
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {b.product.sku} • {b.product.category}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {b.store.name}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        {b.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatINR(b.batchValue)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(b.expiryDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${
                          isExpired 
                            ? 'text-rose-400' 
                            : isUrgent 
                            ? 'text-amber-400' 
                            : isWarning 
                            ? 'text-yellow-400' 
                            : 'text-emerald-400'
                        }`}>
                          {isExpired ? `${Math.abs(b.daysLeft)}d expired` : `${b.daysLeft} days`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1 text-[10px]">
                            <XCircle className="w-3 h-3" /> Expired
                          </Badge>
                        ) : isUrgent ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Urgent
                          </Badge>
                        ) : isWarning ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1 text-[10px]">
                            <Clock className="w-3 h-3" /> Warning
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Batch Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <form onSubmit={handleCreateBatch}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-400" />
                Register Inventory Batch
              </DialogTitle>
              <DialogDescription>
                Track perishable FMCG batches with shelf-life and FEFO rotation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <label className="font-medium text-muted-foreground block mb-1">Store Location</label>
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="w-full text-xs h-9 bg-background border border-border rounded-lg px-2.5 text-foreground"
                  required
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full text-xs h-9 bg-background border border-border rounded-lg px-2.5 text-foreground"
                  required
                >
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1">Batch Number</label>
                <Input
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="e.g., BAT-2026-OCT-09"
                  className="text-xs h-9 bg-background font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="text-xs h-9 bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Cost Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="text-xs h-9 bg-background"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Manufacture Date</label>
                  <Input
                    type="date"
                    value={formData.manufactureDate}
                    onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div>
                  <label className="font-medium text-muted-foreground block mb-1">Expiry Date</label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="text-xs h-9 bg-background"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isSubmitting ? 'Registering...' : 'Register Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
