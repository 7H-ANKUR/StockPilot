'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/components/pages/dashboard';
import { InventoryPage } from '@/components/pages/inventory';
import { ForecastingPage } from '@/components/pages/forecasting';
import { RisksPage } from '@/components/pages/risks';
import { RecommendationsPage } from '@/components/pages/recommendations';
import { AgentChatPage } from '@/components/pages/agent-chat';
import { FestivalsPage } from '@/components/pages/festivals';
import { SuppliersPage } from '@/components/pages/suppliers';
import { PurchaseOrdersPage } from '@/components/pages/purchase-orders';
import { AnalyticsPage } from '@/components/pages/analytics';
import { GstPage } from '@/components/pages/gst';
import { AuditPage } from '@/components/pages/audit';
import { ModelHealthPage } from '@/components/pages/model-health';
import { DataSourcePage } from '@/components/pages/data-source';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export type PageKey =
  | 'dashboard'
  | 'inventory'
  | 'forecasting'
  | 'risks'
  | 'recommendations'
  | 'agent'
  | 'festivals'
  | 'suppliers'
  | 'purchase-orders'
  | 'analytics'
  | 'gst'
  | 'audit'
  | 'models'
  | 'data';

export default function HomePage() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const { toast } = useToast();

  // Check on mount if data is loaded
  const checkBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      if (data.database && data.database.products > 0) {
        setBootstrapped(true);
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    checkBootstrap();
  }, [checkBootstrap]);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const res = await fetch('/api/v1/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'ALL' }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Data ingestion complete',
          description: `${data.results.length} sources processed. Demo data is now available.`,
        });
        setBootstrapped(true);
        // Refresh current page
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      toast({
        title: 'Ingestion failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setBootstrapping(false);
    }
  };

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero p-6">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            AI Inventory Decision Agent
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Welcome to your <span className="text-primary">Retail Intelligence</span> Platform
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            An Agentic AI layer for Indian retail — forecasting, stockout prediction, festival-aware reorders, and human-approved purchase orders.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
            {[
              { label: 'CSV/XLSX Ingestion', val: 'Real Indian data' },
              { label: 'Demand Forecasting', val: '7/14/30-day horizon' },
              { label: 'Stockout Risk', val: 'Deterministic + ML' },
              { label: 'Festival Intelligence', val: 'Diwali, Holi, Eid...' },
            ].map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-card border border-border">
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="text-sm font-medium">{f.val}</div>
              </div>
            ))}
          </div>
          <button
            onClick={handleBootstrap}
            disabled={bootstrapping}
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {bootstrapping ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Loading demo data...
              </>
            ) : (
              <>
                Load Demo Data
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            This will ingest <strong>Supermart Grocery Sales</strong> (~9,994 transactions),{' '}
            <strong>BigBasket Products</strong> (~38,340 products), and{' '}
            <strong>Indian Superstore Sales</strong> (~1,500 orders) plus generate{' '}
            <strong>8 suppliers, 11 festivals, and inventory snapshots</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      currentPage={page}
      onPageChange={setPage}
    >
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'inventory' && <InventoryPage />}
      {page === 'forecasting' && <ForecastingPage />}
      {page === 'risks' && <RisksPage />}
      {page === 'recommendations' && <RecommendationsPage />}
      {page === 'agent' && <AgentChatPage />}
      {page === 'festivals' && <FestivalsPage />}
      {page === 'suppliers' && <SuppliersPage />}
      {page === 'purchase-orders' && <PurchaseOrdersPage />}
      {page === 'analytics' && <AnalyticsPage />}
      {page === 'gst' && <GstPage />}
      {page === 'audit' && <AuditPage />}
      {page === 'models' && <ModelHealthPage />}
      {page === 'data' && <DataSourcePage />}
    </AppShell>
  );
}
