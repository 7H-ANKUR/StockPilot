import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const productCount = await db.product.count();
  const salesCount = await db.sale.count();
  const supplierCount = await db.supplier.count();
  const inventoryCount = await db.inventorySnapshot.count();
  const festivalCount = await db.festival.count();
  const recommendationCount = await db.recommendation.count();
  const poCount = await db.purchaseOrder.count();
  const forecastCount = await db.forecast.count();
  const auditCount = await db.auditEvent.count();
  const dataSources = await db.dataSource.count();
  
  const modelVersions = await db.modelVersion.findMany();
  
  return NextResponse.json({
    database: {
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
    },
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
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
}
