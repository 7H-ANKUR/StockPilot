import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDailySalesSeries, forecastDemand } from '@/lib/forecast';
import { computeStockoutRisk, analyzeFestivalImpact } from '@/lib/inventory';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        supplierProducts: {
          include: { supplier: true },
          orderBy: { preferred: 'desc' },
        },
        recommendations: {
          where: { status: 'PENDING_REVIEW' },
          take: 3,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Latest inventory snapshot
    const latestInventory = await db.inventorySnapshot.findFirst({
      where: { productId: id },
      orderBy: { snapshotDate: 'desc' },
      include: { store: true },
    });

    // Sales history (last 90 days, daily aggregated)
    const salesSeries = await getDailySalesSeries(id, undefined, 90).catch(() => []);

    // Stockout risk assessment
    const risk = await computeStockoutRisk(id).catch(() => null);

    // AI forecast (14 days)
    const forecast = await forecastDemand(id, null, 14).catch(() => null);

    // Festival uplift estimate (Diwali)
    const festivalImpact = await analyzeFestivalImpact(id, 'Diwali').catch(() => null);

    const totalSold90d = salesSeries.reduce((s, x) => s + x.qty, 0);
    const totalRevenue90d = Math.round(totalSold90d * product.sellingPrice);

    return NextResponse.json({
      product: {
        ...product,
        latestInventory: latestInventory || null,
        stockoutRisk: risk,
        forecast,
        festivalImpact,
        stats90d: {
          totalSold: totalSold90d,
          totalRevenue: totalRevenue90d,
          avgDailyDemand: salesSeries.length > 0 ? (totalSold90d / salesSeries.length).toFixed(1) : 0,
        },
        salesHistory: salesSeries.slice(-30), // Last 30 daily data points for charts
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
