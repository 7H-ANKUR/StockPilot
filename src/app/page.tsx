'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const { toast } = useToast();

  const checkBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      if (data.database && data.database.products > 0) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkBootstrap().then((ok) => {
      if (mounted && ok) setBootstrapped(true);
    });
    return () => { mounted = false; };
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
          description: 'Demo data loaded. Entering the dashboard…',
        });
        setBootstrapped(true);
      }
    } catch (e: any) {
      toast({
        title: 'Ingestion failed',
        description: e.message,
        variant: 'destructive',
      });
      setBootstrapping(false);
    }
  };

  // Show landing page until the user enters the dashboard
  if (!bootstrapped) {
    return (
      <LandingPage onEnterDashboard={handleBootstrap} bootstrapping={bootstrapping} />
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
