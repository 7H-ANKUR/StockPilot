'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FestivalsPage() {
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/v1/festivals/upcoming')
      .then(r => r.json())
      .then(d => {
        setFestivals(d.festivals || []);
        if (d.festivals?.length > 0) setSelectedFestival(d.festivals[0].name);
      })
      .finally(() => setLoading(false));
    fetch('/api/v1/products?limit=200')
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        if (d.products?.length > 0) setSelectedProduct(d.products[0].id);
      });
  }, []);

  const analyze = async () => {
    if (!selectedFestival || !selectedProduct) return;
    setAnalyzing(selectedFestival);
    setAnalysis(null);
    try {
      const res = await fetch('/api/v1/festival/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct, eventName: selectedFestival }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Analysis failed', description: data.error, variant: 'destructive' });
      } else {
        setAnalysis(data);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Festival calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Indian Festival Calendar
            </CardTitle>
            <CardDescription>Upcoming festivals (next 90 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted/40 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {festivals.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedFestival(f.name)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedFestival === f.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{f.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {(f.importance * 100).toFixed(0)}% importance
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(f.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {f.startDate !== f.endDate && ` → ${new Date(f.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      {' · '}
                      <span className="text-primary">{f.region.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Type: {f.eventType} · Categories: {f.categories}
                    </div>
                  </button>
                ))}
                {festivals.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No upcoming festivals.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Festival analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Festival Impact Analysis
            </CardTitle>
            <CardDescription>
              Calculate demand uplift based on historical evidence — no fabricated trends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-xs text-muted-foreground">Festival</label>
              <select
                className="w-full p-2 rounded border border-input bg-background text-sm"
                value={selectedFestival}
                onChange={(e) => setSelectedFestival(e.target.value)}
              >
                {festivals.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>
              <label className="text-xs text-muted-foreground mt-2">Product</label>
              <select
                className="w-full p-2 rounded border border-input bg-background text-sm"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <Button onClick={analyze} disabled={!!analyzing} className="w-full">
              {analyzing ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" /> Analyze Impact
                </>
              )}
            </Button>

            {analysis && (
              <div className="space-y-3 pt-2 border-t">
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                  <div className="text-xs text-muted-foreground">Expected Uplift</div>
                  <div className="text-3xl font-bold tabular-nums">
                    {analysis.expectedUplift > 0 ? '+' : ''}{(analysis.expectedUplift * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Forecast Units</div>
                    <div className="font-semibold tabular-nums">{analysis.forecastUnits}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Confidence</div>
                    <div className="font-semibold tabular-nums">{(analysis.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Evidence Days</div>
                    <div className="font-semibold tabular-nums">{analysis.evidenceDays}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed p-2 rounded bg-muted/30">
                  <strong className="text-foreground">Reason:</strong> {analysis.reason}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
