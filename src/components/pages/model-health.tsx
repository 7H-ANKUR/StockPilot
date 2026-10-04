'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, Zap, CheckCircle2 } from 'lucide-react';

export function ModelHealthPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/models').then(r => r.json()).then(d => {
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

  const totalToolCalls = Object.values(data.toolStats).reduce((s: any, t: any) => s + t.success + t.fail, 0);
  const successfulCalls = Object.values(data.toolStats).reduce((s: any, t: any) => s + t.success, 0);
  const successRate = totalToolCalls > 0 ? (successfulCalls / totalToolCalls * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Model registry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Model Registry
          </CardTitle>
          <CardDescription>
            Each forecast identifies its model version, training dataset, feature version, and metrics.
            Enables rollback to a previous model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.models.map((m: any) => (
              <div key={m.id} className="p-4 rounded-md border border-border bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      v{m.version} · feature-v{m.featureVersion} · {m.trainingDataset}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {m.status}
                    </Badge>
                    <Badge variant="outline">{m.forecastCount} forecasts</Badge>
                  </div>
                </div>
                {m.metrics && (
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-muted-foreground">MAE</div>
                      <div className="font-semibold tabular-nums">{m.metrics.mae?.toFixed(2) || '-'}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-muted-foreground">RMSE</div>
                      <div className="font-semibold tabular-nums">{m.metrics.rmse?.toFixed(2) || '-'}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-muted-foreground">WAPE</div>
                      <div className="font-semibold tabular-nums">
                        {m.metrics.wape ? `${(m.metrics.wape * 100).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-muted-foreground">Baseline MAE</div>
                      <div className="font-semibold tabular-nums">{m.metrics.baselineMae?.toFixed(2) || '-'}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              <div className="text-2xl font-bold mt-1 tabular-nums">{totalToolCalls}</div>
            </div>
            <div className="p-3 rounded bg-success/5 border border-success/20">
              <div className="text-xs text-muted-foreground uppercase">Successful</div>
              <div className="text-2xl font-bold mt-1 tabular-nums text-success">{successfulCalls}</div>
            </div>
            <div className="p-3 rounded bg-muted/50 border border-border">
              <div className="text-xs text-muted-foreground uppercase">Success Rate</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{successRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(data.toolStats).map(([tool, stats]: [string, any]) => (
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
            ))}
            {Object.keys(data.toolStats).length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tool calls yet. Use the Agent Chat to trigger tool invocations.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
