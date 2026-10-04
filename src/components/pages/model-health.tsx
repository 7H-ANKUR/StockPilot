'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, Zap, CheckCircle2, AlertCircle, TrendingUp, Shield, BarChart3, Calendar, Layers } from 'lucide-react';

interface ModelMetrics {
  mae?: number;
  rmse?: number;
  wape?: number;
  baselineMae?: number;
  beatsBaseline?: boolean;
  precision?: number;
  recall?: number;
  f1?: number;
  sampleSize?: number;
  evaluationValid?: boolean;
  evaluationNote?: string;
}

interface ModelDescriptor {
  id: string;
  layer: string;
  modelName: string;
  variant: string;
  version: string;
  featureVersion: string;
  description: string;
  status: string;
  metrics?: ModelMetrics;
  isSelected?: boolean;
}

interface ApiResponse {
  architecture: {
    llmLayer: {
      name: string;
      description: string;
      position: string;
    };
    intelligenceLayers: Record<string, {
      title: string;
      description: string;
      models: ModelDescriptor[];
      progression: string[];
    }>;
  };
  toolStats: Record<string, { success: number; fail: number }>;
  toolSummary: {
    totalCalls: number;
    successful: number;
    successRate: number | null;
    evaluationNote: string;
  };
}

const LAYER_META: Record<string, { icon: any; color: string; gradient: string }> = {
  DEMAND_FORECAST: { icon: TrendingUp, color: 'primary', gradient: 'bg-gradient-card-success' },
  STOCKOUT_RISK: { icon: Shield, color: 'destructive', gradient: 'bg-gradient-card-danger' },
  INVENTORY_MOVEMENT: { icon: BarChart3, color: 'info', gradient: 'bg-gradient-card-info' },
  FESTIVAL_INTELLIGENCE: { icon: Calendar, color: 'warning', gradient: 'bg-gradient-card-warning' },
};

export function ModelHealthPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/models').then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Card className="h-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const layers = data.architecture.intelligenceLayers;
  const ts = data.toolSummary;

  return (
    <div className="space-y-6">
      {/* Architecture banner */}
      <Card className="bg-gradient-card-success border-primary/30">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Intelligence Layer Architecture</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Four intelligence layers sit below the LLM orchestration layer.
                The LLM is <strong>not</strong> one of the prediction models — it sits above them,
                calling tools and reasoning over their typed outputs.
              </p>
            </div>
          </div>

          {/* Architecture diagram */}
          <div className="mt-5 flex flex-col items-center gap-3">
            {/* LLM layer (top) */}
            <div className="w-full max-w-2xl p-4 rounded-lg bg-primary text-primary-foreground text-center">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <Brain className="w-4 h-4" />
                {data.architecture.llmLayer.name}
              </div>
              <div className="text-xs opacity-90 mt-1">
                Sits ABOVE the 4 layers · 12 typed tools · Never invents numbers
              </div>
            </div>
            {/* Connector */}
            <div className="w-px h-6 bg-border" />
            {/* 4 intelligence layers (bottom) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
              {Object.entries(layers).map(([key, layer]) => {
                const meta = LAYER_META[key];
                const Icon = meta.icon;
                const selectedModel = layer.models.find(m => m.isSelected);
                return (
                  <div key={key} className={`p-3 rounded-lg border ${meta.gradient} border-border`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${meta.color}`} />
                      <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        {layer.title}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Selected: <span className="font-mono font-medium text-foreground">
                        {selectedModel?.variant || '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {layer.models.length} model{layer.models.length !== 1 ? 's' : ''} registered
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layer details */}
      <div className="space-y-4">
        {Object.entries(layers).map(([key, layer]) => {
          const meta = LAYER_META[key];
          const Icon = meta.icon;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`w-4 h-4 text-${meta.color}`} />
                  {layer.title}
                </CardTitle>
                <CardDescription>{layer.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Progression */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Progression:</span>
                  {layer.progression.map((variant, i) => {
                    const model = layer.models.find(m => m.variant === variant);
                    const isSelected = model?.isSelected;
                    return (
                      <div key={variant} className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : model?.metrics?.evaluationValid === false
                                ? 'bg-muted/50 text-muted-foreground border-border'
                                : 'bg-muted/50'
                          }
                        >
                          {variant}
                          {isSelected && <CheckCircle2 className="w-3 h-3 ml-1" />}
                        </Badge>
                        {i < layer.progression.length - 1 && (
                          <span className="text-muted-foreground text-xs">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Models grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {layer.models.map((model) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tool stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Agent Tool Performance
          </CardTitle>
          <CardDescription>
            Tool-call correctness, failures, and invalid arguments — tracked for production observability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded bg-primary/5 border border-primary/20">
              <div className="text-xs text-muted-foreground uppercase">Total Calls</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{ts.totalCalls}</div>
            </div>
            <div className="p-3 rounded bg-success/5 border border-success/20">
              <div className="text-xs text-muted-foreground uppercase">Successful</div>
              <div className="text-2xl font-bold mt-1 tabular-nums text-success">{ts.successful}</div>
            </div>
            <div className={`p-3 rounded border ${ts.successRate === null ? 'bg-muted/50 border-border' : 'bg-muted/50 border-border'}`}>
              <div className="text-xs text-muted-foreground uppercase">Success Rate</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">
                {ts.successRate === null ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : (
                  `${ts.successRate.toFixed(1)}%`
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {ts.successRate === null && 'No calls yet'}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground italic mb-3 p-2 rounded bg-muted/30">
            {ts.evaluationNote}
          </div>

          <div className="space-y-2">
            {Object.entries(data.toolStats).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tool calls yet. Use the Agent Chat to trigger tool invocations.
              </div>
            ) : (
              Object.entries(data.toolStats).map(([tool, stats]) => (
                <div key={tool} className="flex items-center justify-between p-2 rounded bg-card border border-border">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-3 h-3 ${stats.fail > 0 ? 'text-warning' : 'text-success'}`} />
                    <span className="font-mono text-sm">{tool}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-success tabular-nums">{stats.success} ✓</span>
                    {stats.fail > 0 && (
                      <span className="text-destructive tabular-nums">{stats.fail} ✗</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModelCard({ model }: { model: ModelDescriptor }) {
  const m = model.metrics;
  const isValid = m?.evaluationValid !== false;
  const allZero = m?.mae === 0 && m?.rmse === 0 && m?.baselineMae === 0;
  const showInvalidState = !isValid || allZero;

  return (
    <div className={`p-3 rounded-md border ${model.isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{model.modelName}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{model.variant}</div>
        </div>
        {model.isSelected ? (
          <Badge className="bg-primary text-primary-foreground">
            <CheckCircle2 className="w-3 h-3 mr-1" /> SELECTED
          </Badge>
        ) : model.status === 'BASELINE' ? (
          <Badge variant="outline" className="bg-muted/50">BASELINE</Badge>
        ) : (
          <Badge variant="outline" className="bg-muted/50">CANDIDATE</Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {model.description}
      </div>

      {/* Metrics */}
      {m && (
        <div className="mt-3 space-y-2">
          {showInvalidState ? (
            <div className="p-2 rounded bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
                <AlertCircle className="w-3 h-3" />
                Evaluation Invalid
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.evaluationNote || 'Metrics are 0/0/0 — insufficient data to establish valid evaluation'}
              </div>
            </div>
          ) : (
            <>
              {m.mae !== undefined && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-1.5 rounded bg-muted/50">
                    <div className="text-muted-foreground">MAE</div>
                    <div className="font-semibold tabular-nums">{m.mae.toFixed(3)}</div>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <div className="text-muted-foreground">RMSE</div>
                    <div className="font-semibold tabular-nums">{m.rmse?.toFixed(3)}</div>
                  </div>
                  {m.baselineMae !== undefined && (
                    <div className="p-1.5 rounded bg-muted/50">
                      <div className="text-muted-foreground">Baseline MAE</div>
                      <div className="font-semibold tabular-nums">{m.baselineMae.toFixed(3)}</div>
                    </div>
                  )}
                  {m.wape !== undefined && (
                    <div className="p-1.5 rounded bg-muted/50">
                      <div className="text-muted-foreground">WAPE</div>
                      <div className="font-semibold tabular-nums">{(m.wape * 100).toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              )}
              {m.beatsBaseline !== undefined && m.beatsBaseline && (
                <div className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Beats naive baseline
                </div>
              )}
              {m.evaluationNote && (
                <div className="text-xs text-muted-foreground italic">
                  {m.evaluationNote}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
