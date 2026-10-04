'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ShoppingCart, FileText, IndianRupee, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PurchaseOrdersPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [viewPo, setViewPo] = useState<any | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/v1/purchase-orders');
    const data = await res.json();
    setPos(data.purchaseOrders || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch('/api/v1/suppliers').then(r => r.json()).then(d => setSuppliers(d.suppliers || []));
  }, []);

  const generatePo = async (supplierId: string) => {
    setGeneratingFor(supplierId);
    try {
      const res = await fetch('/api/v1/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: 'Cannot generate PO',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'PO Draft Created',
          description: `${data.purchaseOrder.poNumber} — ${data.purchaseOrder.lines.length} line items, total ₹${data.purchaseOrder.estimatedTotal.toFixed(0)}`,
        });
        load();
      }
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingFor(null);
    }
  };

  const stats = {
    total: pos.length,
    draft: pos.filter(p => p.status === 'DRAFT').length,
    sent: pos.filter(p => p.status === 'SENT').length,
    fulfilled: pos.filter(p => p.status === 'FULFILLED').length,
  };

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Total POs</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Draft</div><div className="text-2xl font-bold">{stats.draft}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Sent</div><div className="text-2xl font-bold">{stats.sent}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Fulfilled</div><div className="text-2xl font-bold">{stats.fulfilled}</div></CardContent></Card>
      </div>

      {/* Generate PO */}
      <Card className="bg-gradient-card-success border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Generate Purchase Order
          </CardTitle>
          <CardDescription>
            Aggregates all APPROVED recommendations by supplier into a single PO draft. Enforces MOQ + supplier constraints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suppliers.filter(s => s.poCount === 0).length === 0 && suppliers.length > 0 ? (
              <p className="text-sm text-muted-foreground">All suppliers have POs generated. Generate more recommendations first.</p>
            ) : (
              suppliers.filter(s => s.poCount === 0).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-card border border-border">
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Lead time: {s.leadTimeDays}d · MOQ: {s.minOrderQty} · {s.productCount} products</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generatePo(s.id)}
                    disabled={generatingFor === s.id}
                  >
                    {generatingFor === s.id ? (
                      <><div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1" /> Generating...</>
                    ) : (
                      <><FileText className="w-3 h-3 mr-1" /> Generate PO</>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* PO list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Purchase Orders
          </CardTitle>
          <CardDescription>
            All POs with line items, totals, and tax breakdown. POs are transactional and idempotent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No purchase orders yet. Generate one above by selecting a supplier.
            </div>
          ) : (
            <div className="space-y-2">
              {pos.map(po => (
                <button
                  key={po.id}
                  onClick={() => setViewPo(po)}
                  className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{po.poNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {po.supplier.name} · {po.lines.length} items · {new Date(po.orderDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{fmtINR(po.estimatedTotal)}</div>
                        <div className="text-xs text-muted-foreground">incl. GST</div>
                      </div>
                      <Badge variant="outline" className={
                        po.status === 'DRAFT' ? 'bg-warning/10 text-warning border-warning/30' :
                        po.status === 'SENT' ? 'bg-info/10 text-info border-info/30' :
                        po.status === 'FULFILLED' ? 'bg-success/10 text-success border-success/30' :
                        ''
                      }>
                        {po.status}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO detail dialog */}
      <Dialog open={!!viewPo} onOpenChange={(open) => !open && setViewPo(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {viewPo?.poNumber}
            </DialogTitle>
            <DialogDescription>
              {viewPo?.supplier?.name} · {viewPo?.store?.name} · Created {viewPo && new Date(viewPo.createdAt).toLocaleString('en-IN')}
            </DialogDescription>
          </DialogHeader>
          {viewPo && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Supplier GSTIN</div>
                  <div className="text-xs font-mono mt-1">{viewPo.supplier?.gstin}</div>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className="mt-1">{viewPo.status}</Badge>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Currency</div>
                  <div className="font-medium mt-1">{viewPo.currency}</div>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Order Date</div>
                  <div className="font-medium mt-1">{new Date(viewPo.orderDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="text-sm font-medium mb-2">Line Items ({viewPo.lines.length})</div>
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewPo.lines.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{l.product.name}</div>
                            <div className="text-xs text-muted-foreground">{l.product.sku}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtINR(l.unitPrice)}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.gstRate}%</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{fmtINR(l.subtotal + l.taxAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="ml-auto w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{fmtINR(viewPo.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span className="tabular-nums">{fmtINR(viewPo.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">{fmtINR(viewPo.estimatedTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
