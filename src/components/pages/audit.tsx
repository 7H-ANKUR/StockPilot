'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileClock, Shield, User } from 'lucide-react';

export function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const params = filter !== 'all' ? `?action=${filter}` : '';
    fetch(`/api/v1/audit${params}`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.events || []);
        setLoading(false);
      });
  }, [filter]);

  const actions = [
    'all', 'RECOMMENDATION_CREATED', 'RECOMMENDATION_APPROVED',
    'RECOMMENDATION_MODIFIED', 'RECOMMENDATION_REJECTED',
    'PO_CREATED', 'PO_DRAFT_CREATED', 'AGENT_TOOL_CALL',
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card-info border-info/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-info mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium">Audit Trail</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Every important action is recorded: recommendation lifecycle, approvals, modifications, PO generation, agent tool calls.
              The audit log is immutable — production systems would write to append-only storage.
            </p>
          </div>
          <Badge variant="outline" className="bg-background">
            {events.length} events
          </Badge>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {actions.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`px-3 py-1 rounded-md text-xs ${
              filter === a ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {a === 'all' ? 'All Events' : a}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="w-4 h-4 text-primary" />
            Audit Events
          </CardTitle>
          <CardDescription>Most recent first</CardDescription>
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
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          e.action.includes('APPROVED') ? 'bg-success/10 text-success border-success/30' :
                          e.action.includes('REJECTED') ? 'bg-destructive/10 text-destructive border-destructive/30' :
                          e.action.includes('MODIFIED') ? 'bg-warning/10 text-warning border-warning/30' :
                          e.action.includes('PO_') ? 'bg-info/10 text-info border-info/30' :
                          'bg-muted/50'
                        }>
                          {e.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{e.resourceType}</div>
                        <div className="font-mono text-muted-foreground">{e.resourceId?.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.user ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {e.user.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">system</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{e.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {e.reason || e.newValue?.slice(0, 80) || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {events.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No audit events in this view.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
