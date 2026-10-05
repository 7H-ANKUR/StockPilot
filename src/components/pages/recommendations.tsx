'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Check, X, Edit3, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
  id: string;
  productId: string;
  product: any;
  supplier: any;
  recommendedQty: number;
  estimatedCost: number;
  riskLevel: string;
  confidence: number;
  reasoningSummary: string;
  festivalEffect: string | null;
  status: string;
  currentStock: number;
  forecastQty: number;
  leadTimeDays: number;
  moq: number;
  safetyStock: number;
  createdAt: string;
}

export function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [serverStats, setServerStats] = useState<{ pending: number; approved: number; rejected: number; poGenerated: number } | null>(null);
  const [modifyTarget, setModifyTarget] = useState<Recommendation | null>(null);
  const [modifyQty, setModifyQty] = useState(0);
  const [modifyComment, setModifyComment] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    const res = await fetch(`/api/v1/recommendations${params}`);
    const data = await res.json();
    setRecs(data.recommendations || []);
    if (data.stats) {
      setServerStats(data.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/reorders/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      toast({
        title: `${data.count} recommendations generated`,
        description: 'AI scanned inventory and created new reorder recommendations.',
      });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const approve = async (rec: Recommendation) => {
    try {
      await fetch(`/api/v1/recommendations/${rec.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      });
      toast({ title: 'Approved', description: `${rec.product.name} - ${rec.recommendedQty} units approved.` });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const reject = async (rec: Recommendation) => {
    try {
      await fetch(`/api/v1/recommendations/${rec.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      });
      toast({ title: 'Rejected', description: `${rec.product.name} recommendation rejected.` });
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const submitModify = async () => {
    if (!modifyTarget) return;
    try {
      await fetch(`/api/v1/recommendations/${modifyTarget.id}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user', finalQty: modifyQty, comment: modifyComment }),
      });
      toast({ title: 'Modified', description: `Updated to ${modifyQty} units.` });
      setModifyTarget(null);
      setModifyQty(0);
      setModifyComment('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const stats = serverStats || {
    pending: recs.filter(r => r.status === 'PENDING_REVIEW').length,
    approved: recs.filter(r => r.status === 'APPROVED' || r.status === 'MODIFIED').length,
    rejected: recs.filter(r => r.status === 'REJECTED').length,
    poGenerated: recs.filter(r => r.status === 'PO_GENERATED').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Reorder Recommendations
          </h2>
          <p className="text-sm text-muted-foreground">
            Each recommendation includes: current stock, forecast, lead-time demand, MOQ, festival effect, confidence, and "why" reasoning.
          </p>
        </div>
        <Button onClick={generate} disabled={generating}>
          <Sparkles className="w-4 h-4 mr-1" />
          {generating ? 'Generating...' : 'Generate New'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-card-warning border-warning/20">
          <CardContent className="pt-4">
            <div className="text-xs text-warning uppercase tracking-wider font-medium">Pending Review</div>
            <div className="text-2xl font-bold mt-1">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card-success border-primary/20">
          <CardContent className="pt-4">
            <div className="text-xs text-primary uppercase tracking-wider font-medium">Approved</div>
            <div className="text-2xl font-bold mt-1">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Rejected</div>
            <div className="text-2xl font-bold mt-1">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">POs Generated</div>
            <div className="text-2xl font-bold mt-1">{stats.poGenerated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all', l: 'All' },
          { v: 'PENDING_REVIEW', l: 'Pending' },
          { v: 'APPROVED', l: 'Approved' },
          { v: 'MODIFIED', l: 'Modified' },
          { v: 'REJECTED', l: 'Rejected' },
          { v: 'PO_GENERATED', l: 'PO Generated' },
        ].map(f => (
          <Button
            key={f.v}
            variant={filter === f.v ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.v)}
          >
            {f.l}
          </Button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse" />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No recommendations in this view. Click "Generate New" to scan inventory and create AI recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recs.map(rec => (
            <Card key={rec.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{rec.product.name}</CardTitle>
                    <CardDescription className="text-xs">{rec.product.sku} · {rec.product.category}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={
                      rec.riskLevel === 'HIGH' ? 'bg-destructive text-destructive-foreground' :
                      rec.riskLevel === 'MEDIUM' ? 'bg-warning text-warning-foreground' :
                      'bg-success text-success-foreground'
                    }>
                      {rec.riskLevel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(rec.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Stock</div>
                    <div className="font-semibold tabular-nums">{rec.currentStock.toFixed(0)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Forecast 7d</div>
                    <div className="font-semibold tabular-nums">{rec.forecastQty.toFixed(0)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">Lead Time</div>
                    <div className="font-semibold tabular-nums">{rec.leadTimeDays}d</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-muted-foreground">MOQ</div>
                    <div className="font-semibold tabular-nums">{rec.moq}</div>
                  </div>
                </div>

                {/* Recommended qty */}
                <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20">
                  <div>
                    <div className="text-xs text-muted-foreground">Recommended Qty</div>
                    <div className="text-2xl font-bold tabular-nums">{rec.recommendedQty}</div>
                    {rec.festivalEffect && (
                      <div className="text-xs text-primary mt-0.5">Festival: {rec.festivalEffect}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Est. Cost</div>
                    <div className="text-lg font-semibold tabular-nums">{fmtINR(rec.estimatedCost || 0)}</div>
                  </div>
                </div>

                {/* Why */}
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Why:</span> {rec.reasoningSummary}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">{rec.status}</Badge>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(rec.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Actions */}
                {rec.status === 'PENDING_REVIEW' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => approve(rec)}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      setModifyTarget(rec);
                      setModifyQty(rec.recommendedQty);
                      setModifyComment('');
                    }}>
                      <Edit3 className="w-3 h-3 mr-1" /> Modify
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => reject(rec)}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {rec.status === 'APPROVED' && (
                  <div className="text-xs text-success font-medium pt-2 border-t">
                    ✓ Approved — eligible for PO generation. Visit Purchase Orders page to create draft.
                  </div>
                )}
                {rec.status === 'PO_GENERATED' && (
                  <div className="text-xs text-primary font-medium pt-2 border-t">
                    ✓ Purchase order generated for this recommendation.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modify dialog */}
      <Dialog open={!!modifyTarget} onOpenChange={(open) => !open && setModifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Recommendation</DialogTitle>
            <DialogDescription>
              Enter the new quantity for {modifyTarget?.product.name}. The original AI recommendation ({modifyTarget?.recommendedQty}) and your final quantity will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="qty">Final Quantity</Label>
              <Input
                id="qty"
                type="number"
                value={modifyQty}
                onChange={(e) => setModifyQty(parseInt(e.target.value) || 0)}
                min={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original AI recommendation: {modifyTarget?.recommendedQty} units · MOQ: {modifyTarget?.moq}
              </p>
            </div>
            <div>
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={modifyComment}
                onChange={(e) => setModifyComment(e.target.value)}
                placeholder="Reason for modification..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyTarget(null)}>Cancel</Button>
            <Button onClick={submitModify} disabled={modifyQty <= 0}>
              <Check className="w-3 h-3 mr-1" /> Confirm Modification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
