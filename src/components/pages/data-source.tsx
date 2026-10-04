'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Database, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export function DataSourcePage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/data/import').then(r => r.json()).then(d => {
      setSources(d.sources || []);
      setLoading(false);
    });
  }, []);

  const totalRows = sources.reduce((s, x) => s + (x.rowCount || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card-success border-primary/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Database className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium">Data Provenance & Sources</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Every dataset is tracked with source type, file path, ingestion run, and synthetic flag.
              Synthetic data is never presented as real-world observations (per ADR-005).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Sources</div><div className="text-2xl font-bold">{sources.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Total Rows</div><div className="text-2xl font-bold tabular-nums">{totalRows.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Real Public</div><div className="text-2xl font-bold">{sources.filter(s => s.sourceType === 'REAL_PUBLIC').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase">Synthetic</div><div className="text-2xl font-bold">{sources.filter(s => s.syntheticFlag).length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Data Source Registry
          </CardTitle>
          <CardDescription>
            Provenance: source_dataset · source_file · download_time · ingestion_run · synthetic_flag
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto -mx-6">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Source Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Ingested</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.sourceName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          s.sourceType === 'REAL_PUBLIC' ? 'bg-success/10 text-success border-success/30' :
                          s.sourceType === 'SYNTHETIC' ? 'bg-warning/10 text-warning border-warning/30' :
                          'bg-info/10 text-info border-info/30'
                        }>
                          {s.sourceType.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">
                        {s.sourceFile || '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.rowCount?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{s.version}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.downloadTime ? new Date(s.downloadTime).toLocaleString('en-IN') : '-'}
                      </TableCell>
                      <TableCell>
                        {s.syntheticFlag ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            <AlertCircle className="w-3 h-3 mr-1" /> Synthetic
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sources.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No data sources yet. Click "Load Demo Data" on the dashboard to ingest.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
