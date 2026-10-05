import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    let dbStatus = 'healthy';
    let dbError: string | null = null;
    let counts = {
      products: 0,
      sales: 0,
      suppliers: 0,
      inventorySnapshots: 0,
      festivals: 0,
      recommendations: 0,
      purchaseOrders: 0,
      forecasts: 0,
      auditEvents: 0,
      dataSources: 0,
    };
    let modelVersions: any[] = [];

    try {
      const [
        productCount,
        salesCount,
        supplierCount,
        inventoryCount,
        festivalCount,
        recommendationCount,
        poCount,
        forecastCount,
        auditCount,
        dataSources,
        mvList,
      ] = await Promise.all([
        db.product.count(),
        db.sale.count(),
        db.supplier.count(),
        db.inventorySnapshot.count(),
        db.festival.count(),
        db.recommendation.count(),
        db.purchaseOrder.count(),
        db.forecast.count(),
        db.auditEvent.count(),
        db.dataSource.count(),
        db.modelVersion.findMany(),
      ]);

      counts = {
        products: productCount,
        sales: salesCount,
        suppliers: supplierCount,
        inventorySnapshots: inventoryCount,
        festivals: festivalCount,
        recommendations: recommendationCount,
        purchaseOrders: poCount,
        forecasts: forecastCount,
        auditEvents: auditCount,
        dataSources,
      };
      modelVersions = mvList;
    } catch (e: any) {
      console.warn('Database health check error:', e?.message || e);
      dbStatus = 'degraded';
      dbError = e?.message || 'Database connection error';
    }

    // Ping Python backend if configured
    const pythonBaseUrl =
      process.env.PYTHON_BACKEND_URL ||
      process.env.VITE_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    let pythonBackendStatus: any = { status: 'unreachable', url: pythonBaseUrl };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const pyRes = await fetch(`${pythonBaseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (pyRes.ok) {
        pythonBackendStatus = await pyRes.json();
      }
    } catch {
      // Python backend ping failed - non-blocking for frontend health
    }

    return NextResponse.json(
      {
        status: dbStatus === 'healthy' ? 'OK' : 'DEGRADED',
        service: 'StockPilot Next.js API',
        timestamp: new Date().toISOString(),
        database: counts,
        dbStatus,
        ...(dbError ? { dbError } : {}),
        pythonBackend: pythonBackendStatus,
        models: modelVersions.map(m => ({
          id: m.id,
          name: m.modelName,
          version: m.version,
          status: m.status,
          metrics: m.metricsJson ? JSON.parse(m.metricsJson) : null,
        })),
        apis: [
          'POST /api/v1/data/import',
          'GET /api/v1/sales/summary',
          'GET /api/v1/inventory',
          'GET /api/v1/inventory/risks',
          'POST /api/v1/forecast',
          'GET /api/v1/products/{id}/forecast',
          'GET /api/v1/festivals/upcoming',
          'POST /api/v1/festival/analyze',
          'POST /api/v1/reorders/recommend',
          'GET /api/v1/recommendations',
          'POST /api/v1/recommendations/{id}/approve',
          'POST /api/v1/recommendations/{id}/modify',
          'POST /api/v1/recommendations/{id}/reject',
          'GET/POST /api/v1/purchase-orders',
          'GET /api/v1/gst/reports',
          'POST /api/v1/agent/chat',
        ],
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'ERROR',
        error: err?.message || 'Internal health check error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
}
