'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Truck, Clock, IndianRupee, Shield } from 'lucide-react';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/suppliers')
      .then(r => r.json())
      .then(d => {
        setSuppliers(d.suppliers || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Total Suppliers</div>
              <div className="text-xl font-bold">{suppliers.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-info/15 text-info flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Avg Lead Time</div>
              <div className="text-xl font-bold">
                {suppliers.length > 0
                  ? (suppliers.reduce((s, x) => s + x.leadTimeDays, 0) / suppliers.length).toFixed(1)
                  : '-'}d
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-success/15 text-success flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Avg Reliability</div>
              <div className="text-xl font-bold">
                {suppliers.length > 0
                  ? (suppliers.reduce((s, x) => s + x.reliabilityScore, 0) / suppliers.length * 100).toFixed(0)
                  : '-'}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-warning/15 text-warning flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Total POs</div>
              <div className="text-xl font-bold">
                {suppliers.reduce((s, x) => s + x.poCount, 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Supplier Directory
          </CardTitle>
          <CardDescription>
            Each supplier enforces constraints (MOQ, lead time, payment terms) used by the reorder engine.
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
                    <TableHead>Supplier</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Lead Time</TableHead>
                    <TableHead className="text-right">MOQ</TableHead>
                    <TableHead className="text-right">Reliability</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">POs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.code}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{s.gstin}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.leadTimeDays}d</TableCell>
                      <TableCell className="text-right tabular-nums">{s.minOrderQty}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={
                          s.reliabilityScore >= 0.9 ? 'bg-success/10 text-success border-success/30' :
                          s.reliabilityScore >= 0.85 ? 'bg-primary/10 text-primary border-primary/30' :
                          'bg-warning/10 text-warning border-warning/30'
                        }>
                          {(s.reliabilityScore * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.paymentTerms}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.productCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.poCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
