'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';

export function GstPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/gst/reports').then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card-info border-info/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Receipt className="w-5 h-5 text-info mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium">GST Module — AI-Assisted Reporting</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Calculates CGST/SGST/IGST for sales (output tax) and purchases (input tax).
              This is an AI-assisted reporting layer, not a replacement for professional tax filing software.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-card-success border-primary/20">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Output Tax (Sales)</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{fmtINR(data.outputTax.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Taxable: {fmtINR(data.outputTax.taxableValue)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card-info border-info/20">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Input Tax (Purchases)</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{fmtINR(data.inputTax.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Taxable: {fmtINR(data.inputTax.taxableValue)}
            </div>
          </CardContent>
        </Card>
        <Card className={data.netPayable >= 0 ? 'bg-gradient-card-danger border-destructive/20' : 'bg-gradient-card-success border-primary/20'}>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase">Net Payable</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{fmtINR(data.netPayable)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.netPayable >= 0 ? 'Output - Input (pay to govt)' : 'Net credit available'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Output Tax Breakdown (Sales)
            </CardTitle>
            <CardDescription>By GST rate slab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">CGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.outputTax.cgst)}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">SGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.outputTax.sgst)}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">IGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.outputTax.igst)}</div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GST Rate</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outputTax.byRate.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{r.gstRate}%</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(r.taxableValue)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtINR(r.tax)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="w-4 h-4 text-info" />
              Input Tax Breakdown (Purchases)
            </CardTitle>
            <CardDescription>By GST rate slab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">CGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.inputTax.cgst)}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">SGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.inputTax.sgst)}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground">IGST</div>
                <div className="font-semibold tabular-nums">{fmtINR(data.inputTax.igst)}</div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GST Rate</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inputTax.byRate.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                      No purchase transactions yet. Generate POs to see input tax.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.inputTax.byRate.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{r.gstRate}%</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(r.taxableValue)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtINR(r.tax)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
