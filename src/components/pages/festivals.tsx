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
    fetch('/api/v1/products?limit=250&withSalesFirst=true')
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
                {Array.from(new Set(festivals.map(f => f.name))).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <label className="text-xs text-muted-foreground mt-2">Product</label>
              <select
                className="w-full p-2 rounded border border-input bg-background text-sm"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.hasSales ? '★ ' : ''}{p.name} ({p.sku}){p.hasSales ? ' [POS Sales]' : ''}
                  </option>
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
              <div className="space-y-3.5 pt-3 border-t border-border/60">
                {/* Original Uplift Card */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-background to-background relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Festive Demand Uplift
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                      {analysis.expectedUplift >= 0.35 ? 'High Surge' : analysis.expectedUplift >= 0.20 ? 'Moderate Surge' : 'Baseline Footfall'}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-emerald-400 tabular-nums">
                      +{Math.max(0, Math.round(analysis.expectedUplift * 100))}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      surge over standard baseline
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60">
                    <div className="text-[11px] text-muted-foreground font-medium">Forecast Units</div>
                    <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">{analysis.forecastUnits}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60">
                    <div className="text-[11px] text-muted-foreground font-medium">Model Confidence</div>
                    <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">{(analysis.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60">
                    <div className="text-[11px] text-muted-foreground font-medium">Evidence Days</div>
                    <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">{analysis.evidenceDays}d</div>
                  </div>
                </div>

                {/* AI Rationale Box */}
                <div className="text-xs text-muted-foreground leading-relaxed p-3 rounded-xl bg-card/60 border border-border/60">
                  <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <span>Retail Intelligence Rationale</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/90">{analysis.reason}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
