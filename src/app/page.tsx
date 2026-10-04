'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { LandingPage } from '@/components/landing-page';
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
  // `entered` gates the landing page — always starts false on a fresh page load,
  // so the user always sees the landing page first. Only flips to true when they
  // click "Explore the platform".
  const [entered, setEntered] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const { toast } = useToast();

  // Check if data is already loaded (so we can skip ingestion on "Explore")
  const checkData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      return !!(data.database && data.database.products > 0);
    } catch {
      return false;
    }
  }, []);

  const handleEnter = async () => {
    setBootstrapping(true);
    // Only ingest if data isn't already loaded
    const alreadyLoaded = await checkData();
    if (!alreadyLoaded) {
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
            description: 'Demo data loaded. Entering the dashboard…',
          });
        }
      } catch (e: any) {
        toast({
          title: 'Ingestion failed',
          description: e.message,
          variant: 'destructive',
        });
        setBootstrapping(false);
        return;
      }
    }
    setBootstrapping(false);
    setEntered(true);
  };

  // Always show the landing page first — only enter the dashboard after explicit click
  if (!entered) {
    return (
      <LandingPage onEnterDashboard={handleEnter} bootstrapping={bootstrapping} />
    );
  }

  return (
    <AppShell currentPage={page} onPageChange={setPage}>
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
