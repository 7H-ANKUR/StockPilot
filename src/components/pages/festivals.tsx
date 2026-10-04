'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, ArrowRight, ShieldCheck, Clock, Layers, PackageCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FestivalsPageProps {
  onNavigate?: (page: string) => void;
}

export function FestivalsPage({ onNavigate }: FestivalsPageProps) {
  const [festivals, setFestivals] = useState<any[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [proactiveData, setProactiveData] = useState<any | null>(null);
  const { toast } = useToast();

  // Load upcoming festivals
  useEffect(() => {
    fetch('/api/v1/festivals/upcoming')
      .then(r => r.json())
      .then(d => {
        const list = d.festivals || [];
        setFestivals(list);
        if (list.length > 0) {
          // Automatically select the most immediate upcoming festival
          setSelectedFestival(list[0].name);
        }
      })
      .catch(err => {
        console.error('Failed to load upcoming festivals:', err);
      })
      .finally(() => setLoadingFestivals(false));
  }, []);

  // Load proactive alerts whenever selected festival changes
  useEffect(() => {
    if (!selectedFestival) return;
    setLoadingAlerts(true);
    fetch(`/api/v1/festival/proactive-alerts?festivalName=${encodeURIComponent(selectedFestival)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          toast({ title: 'Alert Error', description: d.error, variant: 'destructive' });
        } else {
          setProactiveData(d);
        }
      })
      .catch(err => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      })
      .finally(() => setLoadingAlerts(false));
  }, [selectedFestival, toast]);

  // Helper for dynamic festival emoji
  const getFestivalEmoji = (name: string = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('diwali')) return '🎆';
    if (lower.includes('holi')) return '🎨';
    if (lower.includes('christmas')) return '🎄';
    if (lower.includes('dussehra')) return '🏹';
    if (lower.includes('eid')) return '🌙';
    if (lower.includes('pongal') || lower.includes('onam')) return '🌾';
    if (lower.includes('raksha')) return '🪡';
    return '🪔';
  };

  const festivalEmoji = proactiveData ? getFestivalEmoji(proactiveData.festival.name) : '🪔';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Indian Festival Calendar (5 columns) */}
        <Card className="lg:col-span-5 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Indian Festival Calendar
            </CardTitle>
            <CardDescription>Upcoming festivals (next 90 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFestivals ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted/40 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {festivals.map((f, i) => {
                  const isSelected = selectedFestival === f.name;
                  return (
                    <button
                      key={f.id || i}
                      onClick={() => setSelectedFestival(f.name)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                          : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <span>{getFestivalEmoji(f.name)}</span>
                          <span className={isSelected ? 'text-primary' : 'text-foreground'}>{f.name}</span>
                        </div>
                        <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
                          {(f.importance * 100).toFixed(0)}% importance
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground/70" />
                        <span>
                          {new Date(f.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {f.startDate !== f.endDate && ` → ${new Date(f.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </span>
                        <span>·</span>
                        <span className="text-primary font-medium">{f.region.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
                        Type: {f.eventType} · Categories: {f.categories}
                      </div>
                    </button>
                  );
                })}
                {festivals.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No upcoming festivals detected in calendar.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Proactive Festival Inventory Alert & Recommendation Panel (7 columns) */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3 border-b">
            {loadingAlerts && !proactiveData ? (
              <div className="h-12 bg-muted/40 rounded animate-pulse" />
            ) : proactiveData ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 tracking-tight">
                    <span className="text-xl">{festivalEmoji}</span>
                    <span className="uppercase">{proactiveData.festival.name} DEMAND ALERT</span>
                  </CardTitle>
                  <Badge variant="destructive" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {proactiveData.festival.daysRemaining === 0
                      ? 'TODAY'
                      : `${proactiveData.festival.daysRemaining} DAYS REMAINING`}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Festival Date: <span className="font-semibold text-foreground">{proactiveData.festival.formattedDate}</span>
                </CardDescription>
              </div>
            ) : (
              <CardTitle>Festival Inventory Recommendations</CardTitle>
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {loadingAlerts ? (
              <div className="space-y-4 py-8">
                <div className="h-10 bg-muted/40 rounded animate-pulse" />
                <div className="h-32 bg-muted/40 rounded animate-pulse" />
                <div className="h-32 bg-muted/40 rounded animate-pulse" />
              </div>
            ) : proactiveData ? (
              <>
                {/* Short AI Insight Banner */}
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5 shadow-sm">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">
                    &quot;{proactiveData.insight}&quot;
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> High-Demand Categories
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {proactiveData.categoryAlerts.length} Categories Candidate
                  </span>
                </div>

                {/* High-demand category cards list */}
                <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                  {proactiveData.categoryAlerts.map((cat: any, idx: number) => {
                    const isHigh = cat.priority === 'HIGH';
                    const isMedium = cat.priority === 'MEDIUM';

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isHigh
                            ? 'border-red-500/30 bg-red-500/5 dark:bg-red-950/20'
                            : isMedium
                            ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20'
                            : 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
                        }`}
                      >
                        {/* Header of category card */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{cat.categoryName}</span>
                            <Badge variant="outline" className="text-[10px] py-0 font-medium border-muted-foreground/30">
                              Expected Impact: {cat.expectedImpact}
                            </Badge>
                          </div>
                          <Badge
                            className={`text-xs font-semibold px-2.5 py-0.5 border ${
                              isHigh
                                ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
                                : isMedium
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {cat.statusBadge}
                          </Badge>
                        </div>

                        {/* Evidence Badge / POS uplift text */}
                        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                          {cat.hasHistoricalData ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3" />
                              Historical POS Uplift: {cat.demandUpliftText}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3 h-3 text-muted-foreground/70" />
                              Insufficient historical evidence (Low confidence)
                            </span>
                          )}
                        </div>

                        {/* Inventory Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                            <div className="text-muted-foreground text-[11px] font-medium">Current Stock</div>
                            <div className="text-base font-bold tabular-nums text-foreground mt-0.5">
                              {cat.currentStock.toLocaleString('en-IN')} <span className="text-xs font-normal text-muted-foreground">units</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                            <div className="text-muted-foreground text-[11px] font-medium">Rec. Min Stock</div>
                            <div className="text-base font-bold tabular-nums text-foreground mt-0.5">
                              {cat.recommendedMinimumStock.toLocaleString('en-IN')} <span className="text-xs font-normal text-muted-foreground">units</span>
                            </div>
                          </div>

                          <div className={`p-2.5 rounded-lg border ${
                            cat.recommendedOrderQty > 0
                              ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                              : 'bg-background/80 border-border/60 text-foreground'
                          }`}>
                            <div className="text-muted-foreground text-[11px] font-medium">Rec. Order Qty</div>
                            <div className="text-base font-bold tabular-nums mt-0.5">
                              {cat.recommendedOrderQty > 0 ? (
                                <span className="text-primary font-bold">{cat.recommendedOrderQty.toLocaleString('en-IN')} units</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">0 (Sufficient)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action Card */}
                {proactiveData.summary.actionRequired ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-foreground space-y-3 pt-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          ⚠️ INVENTORY ACTION REQUIRED
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Historical sales and festival surge models indicate increased demand. Current inventory is insufficient across candidate categories.
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('recommendations');
                        } else {
                          toast({ title: 'Purchase Orders', description: 'Navigating to purchase order recommendations...' });
                        }
                      }}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow"
                    >
                      <PackageCheck className="w-4 h-4 mr-2" />
                      Review Recommendations
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-foreground flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Current inventory levels are sufficient for the upcoming festival.</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onNavigate) onNavigate('recommendations');
                      }}
                      className="text-xs shrink-0"
                    >
                      View All POs
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Select a festival from the calendar to view proactive inventory recommendations.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
