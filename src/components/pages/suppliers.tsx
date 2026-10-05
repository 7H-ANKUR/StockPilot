'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Truck, Clock, IndianRupee, Shield, Plus,
  Search, Award, Package, Trash2, Edit3, CheckCircle2
} from 'lucide-react';
import { ExportButton } from '@/components/export-button';

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  gstin: string | null;
  leadTimeDays: number;
  minOrderQty: number;
  reliabilityScore: number;
  paymentTerms: string;
  productCount: number;
  poCount: number;
  totalSpend: number;
  otifRate: number;
  grade: string;
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    code: '',
    gstin: '',
    leadTimeDays: 3,
    minOrderQty: 10,
    reliabilityScore: 0.90,
    paymentTerms: 'Net 30',
  });

  const loadSuppliers = async () => {
    try {
      const res = await fetch('/api/v1/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (e: any) {
      toast({ title: 'Error loading suppliers', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Failed to add supplier', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Supplier added', description: `${newSupplier.name} registered.` });
        setDialogOpen(false);
        setNewSupplier({
          name: '',
          code: '',
          gstin: '',
          leadTimeDays: 3,
          minOrderQty: 10,
          reliabilityScore: 0.90,
          paymentTerms: 'Net 30',
        });
        loadSuppliers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSupplier = async (supplierId: string) => {
    try {
      const res = await fetch(`/api/v1/suppliers/${supplierId}`);
      const data = await res.json();
      if (data.supplier) {
        setSelectedSupplier(data.supplier);
        setDetailOpen(true);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, s: SupplierItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove supplier ${s.name}?`)) return;
    try {
      const res = await fetch(`/api/v1/suppliers/${s.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Delete failed', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Supplier removed', description: data.message });
        loadSuppliers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">Grade A+</Badge>;
      case 'A':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Grade A</Badge>;
      case 'B':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Grade B</Badge>;
      case 'C':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Grade C</Badge>;
      default:
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Grade D</Badge>;
    }
  };

  const totalSpendAll = suppliers.reduce((sum, s) => sum + s.totalSpend, 0);
  const avgLeadTime = suppliers.length > 0 
    ? (suppliers.reduce((s, x) => s + x.leadTimeDays, 0) / suppliers.length).toFixed(1) 
    : '-';
  const avgReliability = suppliers.length > 0
    ? (suppliers.reduce((s, x) => s + x.reliabilityScore, 0) / suppliers.length * 100).toFixed(0)
    : '-';

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Supplier Scorecard & Catalog</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              OTIF Rated
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor vendor reliability, lead time constraints, and procurement spending across all SKUs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton type="suppliers" label="Export Scorecard (.xlsx)" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateSupplier}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Register New Supplier
                </DialogTitle>
                <DialogDescription>
                  Define lead times, minimum order quantities, and payment terms for auto-reordering.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Supplier Business Name *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Apex FMCG Distributors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Supplier Code *</label>
                    <input
                      type="text"
                      required
                      value={newSupplier.code}
                      onChange={e => setNewSupplier({ ...newSupplier, code: e.target.value.toUpperCase() })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. SUP-004"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">GSTIN</label>
                    <input
                      type="text"
                      value={newSupplier.gstin}
                      onChange={e => setNewSupplier({ ...newSupplier, gstin: e.target.value.toUpperCase() })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm uppercase font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Lead Time (d)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={newSupplier.leadTimeDays}
                      onChange={e => setNewSupplier({ ...newSupplier, leadTimeDays: parseInt(e.target.value) || 1 })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Min Order Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={newSupplier.minOrderQty}
                      onChange={e => setNewSupplier({ ...newSupplier, minOrderQty: parseInt(e.target.value) || 1 })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Reliability Score</label>
                    <input
                      type="number"
                      step="0.05"
                      min={0.1}
                      max={1.0}
                      value={newSupplier.reliabilityScore}
                      onChange={e => setNewSupplier({ ...newSupplier, reliabilityScore: parseFloat(e.target.value) || 0.9 })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Payment Terms</label>
                  <select
                    value={newSupplier.paymentTerms}
                    onChange={e => setNewSupplier({ ...newSupplier, paymentTerms: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Immediate">Immediate / Advance</option>
                    <option value="Cash On Delivery">Cash On Delivery (COD)</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Register Supplier'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Total Vendors</div>
            <div className="text-xl font-bold">{suppliers.length}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Avg Lead Time</div>
            <div className="text-xl font-bold">{avgLeadTime}d</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Avg Reliability</div>
            <div className="text-xl font-bold">{avgReliability}%</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Total PO Spend</div>
            <div className="text-xl font-bold">₹{totalSpendAll.toLocaleString('en-IN')}</div>
          </div>
        </Card>
      </div>

      {/* Supplier Directory Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Performance Directory
              </CardTitle>
              <CardDescription>
                Vendor constraints (MOQ, lead time, reliability) strictly govern the reorder engine.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vendor or GSTIN…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-center">Scorecard</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Lead Time</TableHead>
                    <TableHead className="text-right">MOQ</TableHead>
                    <TableHead className="text-right">Reliability</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">SKUs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((s) => (
                    <TableRow
                      key={s.id}
                      onClick={() => handleViewSupplier(s.id)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors text-xs group"
                      title="Click to view supplier catalog & order history"
                    >
                      <TableCell>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{s.code}</div>
                      </TableCell>

                      <TableCell className="text-center">
                        {getGradeBadge(s.grade)}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {s.gstin || '—'}
                      </TableCell>

                      <TableCell className="text-right tabular-nums font-mono font-medium">
                        {s.leadTimeDays}d
                      </TableCell>

                      <TableCell className="text-right tabular-nums font-mono">
                        {s.minOrderQty}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            s.reliabilityScore >= 0.9
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : s.reliabilityScore >= 0.8
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }
                        >
                          {(s.reliabilityScore * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {s.paymentTerms}
                      </TableCell>

                      <TableCell className="text-right tabular-nums font-medium">
                        {s.productCount}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteSupplier(e, s)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Remove vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        No suppliers match the search query.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Catalog & Detail Modal */}
      {selectedSupplier && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    {selectedSupplier.name}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs mt-0.5">
                    {selectedSupplier.code} · GSTIN: {selectedSupplier.gstin || 'N/A'}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedSupplier.paymentTerms}
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-3 border-y text-xs">
              <div className="p-2.5 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-[11px]">Guaranteed Lead Time</div>
                <div className="text-base font-bold mt-0.5">{selectedSupplier.leadTimeDays} Days</div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-[11px]">Minimum Order Quantity</div>
                <div className="text-base font-bold mt-0.5">{selectedSupplier.minOrderQty} Units</div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-[11px]">Historical Reliability</div>
                <div className="text-base font-bold mt-0.5 text-emerald-600">
                  {(selectedSupplier.reliabilityScore * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Mapped Products */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                Supplied Product Catalog ({selectedSupplier.supplierProducts?.length || 0} SKUs)
              </div>
              <div className="max-h-56 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/40 text-[11px]">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-center">Preference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplier.supplierProducts?.map((sp: any) => (
                      <TableRow key={sp.id} className="text-xs">
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {sp.product.sku}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sp.product.name}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ₹{sp.unitCost}
                        </TableCell>
                        <TableCell className="text-center">
                          {sp.preferred ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                              Primary
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Secondary</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
