'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus, 
  Sparkles, 
  Store as StoreIcon, 
  ArrowRight,
  Package, 
  Search,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ExportButton } from '@/components/export-button';

interface Store {
  id: string;
  code: string;
  name: string;
  city?: string;
  state?: string;
}

interface TransferLine {
  id: string;
  productId: string;
  quantity: number;
  reason?: string;
  product: {
    id: string;
    sku: string;
    name: string;
    category?: string;
    sellingPrice?: number;
  };
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  toStoreId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedBy?: string;
  approvedBy?: string;
  requestDate: string;
  completedDate?: string;
  notes?: string;
  fromStore: Store;
  toStore: Store;
  lines: TransferLine[];
}

interface Suggestion {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  fromStore: Store;
  toStore: Store;
  fromStoreStock: number;
  toStoreStock: number;
  suggestedQty: number;
  reason: string;
  estimatedValue: number;
}

export function TransfersPage({ onSelectProduct }: { onSelectProduct?: (productId: string) => void }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [counts, setCounts] = useState({ total: 0, draft: 0, inTransit: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New transfer form state
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLines, setTransferLines] = useState<Array<{ productId: string; productName: string; quantity: number; reason: string }>>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; sku: string; name: string; category?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'ALL' 
        ? '/api/v1/transfers' 
        : `/api/v1/transfers?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.transfers) {
        setTransfers(data.transfers);
        setStores(data.stores || []);
        setSuggestions(data.suggestions || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  // Load available products for transfer creation
  useEffect(() => {
    fetch('/api/v1/inventory?limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.items) {
          setAvailableProducts(d.items.map((i: any) => ({
            id: i.productId,
            sku: i.sku,
            name: i.name,
            category: i.category,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenCreateWithSuggestion = (sug: Suggestion) => {
    setFromStoreId(sug.fromStore.id);
    setToStoreId(sug.toStore.id);
    setTransferNotes(`AI Rebalance recommendation for ${sug.productName}`);
    setTransferLines([{
      productId: sug.productId,
      productName: `${sug.name || sug.productName} (${sug.sku})`,
      quantity: sug.suggestedQty,
      reason: sug.reason,
    }]);
    setIsCreateOpen(true);
  };

  const handleOpenCreateBlank = () => {
    if (stores.length >= 2) {
      setFromStoreId(stores[0].id);
      setToStoreId(stores[1].id);
    }
    setTransferNotes('');
    if (availableProducts.length > 0) {
      setTransferLines([{
        productId: availableProducts[0].id,
        productName: availableProducts[0].name,
        quantity: 10,
        reason: 'REBALANCE'
      }]);
    } else {
      setTransferLines([]);
    }
    setIsCreateOpen(true);
  };

  const handleAddLine = () => {
    if (availableProducts.length === 0) return;
    setTransferLines([
      ...transferLines,
      {
        productId: availableProducts[0].id,
        productName: availableProducts[0].name,
        quantity: 10,
        reason: 'REBALANCE'
      }
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setTransferLines(transferLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...transferLines];
    if (field === 'productId') {
      const p = availableProducts.find(x => x.id === value);
      updated[index].productId = value;
      updated[index].productName = p ? p.name : '';
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, Number(value) || 1);
    } else if (field === 'reason') {
      updated[index].reason = value;
    }
    setTransferLines(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromStoreId === toStoreId) {
      alert('Source and destination store cannot be the same!');
      return;
    }
    if (transferLines.length === 0) {
      alert('Please add at least one product line item.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStoreId,
          toStoreId,
          notes: transferNotes,
          lines: transferLines.map(l => ({
            productId: l.productId,
            quantity: l.quantity,
            reason: l.reason,
          }))
        })
      });
      if (res.ok) {
        setIsCreateOpen(false);
        await fetchTransfers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create transfer');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (transferId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/transfers/${transferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchTransfers();
        if (selectedTransfer && selectedTransfer.id === transferId) {
          const updated = await res.json();
          setSelectedTransfer(updated.transfer);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.fromStore?.name?.toLowerCase().includes(q) ||
      t.toStore?.name?.toLowerCase().includes(q) ||
      t.lines?.some(l => l.product?.name?.toLowerCase().includes(q) || l.product?.sku?.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_TRANSIT':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1.5"><Truck className="w-3 h-3 animate-pulse" /> In Transit</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1.5"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
      case 'DRAFT':
        return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30 gap-1.5"><Clock className="w-3 h-3" /> Draft</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1.5"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ArrowRightLeft className="w-7 h-7 text-indigo-400" />
            Multi-Store Inventory Transfers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rebalance stock across retail hubs, resolve local stockout spikes, and track inter-store logistics.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ExportButton type="transfers" label="Export Transfers (.xlsx)" />
          <Button onClick={handleOpenCreateBlank} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
            New Transfer Request
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Transfers</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{counts.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Transit</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{counts.inTransit}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{counts.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Connected Stores</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{stores.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Smart Rebalancing Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  AI Stock Rebalancing Opportunities
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                {suggestions.length} Suggested Transfers
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Stock imbalances detected: source stores have surplus while destination stores face immediate stockout risks.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.map((sug, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-card/60 border border-border/70 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground line-clamp-1">{sug.productName}</span>
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 shrink-0">
                        Urgent
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{sug.sku}</p>

                    <div className="mt-3 flex items-center justify-between text-xs bg-background/50 p-2 rounded-lg border border-border/40">
                      <div>
                        <p className="text-[10px] text-muted-foreground">{sug.fromStore.name.split('-')[0]}</p>
                        <p className="font-semibold text-emerald-400">{sug.fromStoreStock} in stock</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">{sug.toStore.name.split('-')[0]}</p>
                        <p className="font-semibold text-rose-400">{sug.toStoreStock} low stock</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-xs font-medium text-indigo-300">
                      Transfer: <strong>{sug.suggestedQty} units</strong>
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenCreateWithSuggestion(sug)}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5"
                    >
                      Initiate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-card/60 border border-border/60 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['ALL', 'IN_TRANSIT', 'DRAFT', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              {st === 'ALL' ? 'All Transfers' : st.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transfer #, store, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card/50 border-border/60"
          />
        </div>
      </div>

      {/* Transfers List */}
      <Card className="bg-card/40 border-border/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-accent/30 text-muted-foreground font-medium border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Source & Destination</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading transfers...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transfers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const totalUnits = t.lines.reduce((sum, l) => sum + l.quantity, 0);
                  return (
                    <tr key={t.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {t.transferNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{t.fromStore?.name || 'Main Hub'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{t.toStore?.name || 'Retail Store'}</span>
                        </div>
                        {t.requestedBy && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">By {t.requestedBy}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground">{t.lines.length} SKUs</span>
                        <span className="text-muted-foreground ml-1.5">({totalUnits} units)</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(t.requestDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedTransfer(t);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>

                          {t.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                              onClick={() => handleUpdateStatus(t.id, 'IN_TRANSIT')}
                            >
                              Dispatch
                            </Button>
                          )}

                          {t.status === 'IN_TRANSIT' && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                              onClick={() => handleUpdateStatus(t.id, 'COMPLETED')}
                            >
                              Receive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl bg-card border-border">
          {selectedTransfer && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-400" />
                    {selectedTransfer.transferNumber}
                  </DialogTitle>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
                <DialogDescription>
                  Inter-store transfer requested on {new Date(selectedTransfer.requestDate).toLocaleString('en-IN')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Store Route */}
                <div className="p-3 bg-accent/20 rounded-xl border border-border/40 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Origin</p>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTransfer.fromStore?.name}</p>
                    <p className="text-muted-foreground text-[11px]">{selectedTransfer.fromStore?.city}, {selectedTransfer.fromStore?.state}</p>
                  </div>
                  <div className="p-2 rounded-full bg-accent/50 text-indigo-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Destination</p>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTransfer.toStore?.name}</p>
                    <p className="text-muted-foreground text-[11px]">{selectedTransfer.toStore?.city}, {selectedTransfer.toStore?.state}</p>
                  </div>
                </div>

                {/* Notes if any */}
                {selectedTransfer.notes && (
                  <div className="p-2.5 bg-background/50 rounded-lg border border-border/40 text-xs">
                    <span className="font-semibold text-muted-foreground">Notes: </span>
                    <span className="text-foreground">{selectedTransfer.notes}</span>
                  </div>
                )}

                {/* Line Items Table */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Transferred Products ({selectedTransfer.lines.length})
                  </h4>
                  <div className="border border-border/60 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-accent/40 text-muted-foreground font-medium">
                        <tr>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-right">Quantity</th>
                          <th className="py-2 px-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {selectedTransfer.lines.map((l) => (
                          <tr key={l.id} className="hover:bg-accent/10">
                            <td className="py-2 px-3 font-medium text-foreground">
                              {onSelectProduct ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDetailOpen(false);
                                    onSelectProduct(l.productId);
                                  }}
                                  className="text-left text-indigo-400 hover:text-indigo-300 hover:underline"
                                >
                                  {l.product.name}
                                </button>
                              ) : (
                                l.product.name
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">{l.product.sku}</td>
                            <td className="py-2 px-3 text-right font-semibold text-foreground">{l.quantity}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px] py-0">
                                {l.reason?.replace('_', ' ') || 'Rebalance'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sign-off info */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                  <div>
                    <p>Requested By: <strong className="text-foreground">{selectedTransfer.requestedBy || 'Store Lead'}</strong></p>
                  </div>
                  <div className="text-right">
                    <p>Approved By: <strong className="text-foreground">{selectedTransfer.approvedBy || (selectedTransfer.status === 'COMPLETED' ? 'System Lead' : 'Pending')}</strong></p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/40 pt-3">
                <div>
                  {selectedTransfer.status === 'DRAFT' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'CANCELLED')}
                    >
                      Cancel Transfer
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedTransfer.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'IN_TRANSIT')}
                    >
                      Dispatch Stock
                    </Button>
                  )}
                  {selectedTransfer.status === 'IN_TRANSIT' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => handleUpdateStatus(selectedTransfer.id, 'COMPLETED')}
                    >
                      Confirm Stock Received
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Transfer Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-card border-border">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Initiate Inter-Store Transfer
              </DialogTitle>
              <DialogDescription>
                Transfer inventory from surplus store to destination location.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Stores Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Source Store (From)
                  </label>
                  <select
                    value={fromStoreId}
                    onChange={(e) => setFromStoreId(e.target.value)}
                    className="w-full text-xs h-9 bg-background border border-border rounded-lg px-2.5 text-foreground"
                    required
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Target Store (To)
                  </label>
                  <select
                    value={toStoreId}
                    onChange={(e) => setToStoreId(e.target.value)}
                    className="w-full text-xs h-9 bg-background border border-border rounded-lg px-2.5 text-foreground"
                    required
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Transfer Line Items</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddLine}
                    className="h-6 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Product
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {transferLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-accent/20 p-2 rounded-lg border border-border/40">
                      <div className="flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                          className="w-full text-xs h-8 bg-background border border-border rounded-md px-2 text-foreground"
                        >
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="h-8 text-xs bg-background"
                          placeholder="Qty"
                        />
                      </div>

                      <div className="w-32">
                        <select
                          value={line.reason}
                          onChange={(e) => handleLineChange(idx, 'reason', e.target.value)}
                          className="w-full text-xs h-8 bg-background border border-border rounded-md px-1.5 text-foreground"
                        >
                          <option value="STOCKOUT_PREVENTION">Stockout Risk</option>
                          <option value="OVERSTOCK_RELIEF">Overstock Relief</option>
                          <option value="REBALANCE">General Rebalance</option>
                        </select>
                      </div>

                      {transferLines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLine(idx)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Transfer Logistics Notes
                </label>
                <Input
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g., Scheduled dispatch via regional logistics van #KA-04-1234"
                  className="text-xs h-9 bg-background"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSubmitting ? 'Creating...' : 'Create Transfer Draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
