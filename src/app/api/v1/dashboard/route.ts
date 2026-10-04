import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeStockoutRisk } from '@/lib/inventory';
import { getDailySalesSeries } from '@/lib/forecast';
import { getRangeStart } from '@/lib/dates';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function GET() {
  // Anchor on actual data range (latest sale in DB)
  const { start: start30, end: end30 } = await getRangeStart(30);
  const sales30 = await db.sale.findMany({
    where: { saleTimestamp: { gte: start30, lte: end30 } },
    include: { product: true },
  });

  const totalRevenue30d = sales30.reduce((s, x) => s + x.netSales, 0);
  const transactions30d = sales30.length;
  const avgOrderValue = transactions30d > 0 ? totalRevenue30d / transactions30d : 0;

  // All-time totals (no date filter)
  const allSales = await db.sale.findMany({ select: { netSales: true, quantity: true, saleTimestamp: true } });
  const totalRevenue = allSales.reduce((s, x) => s + x.netSales, 0);
  const totalQty = allSales.reduce((s, x) => s + x.quantity, 0);

  // Top movers (last 30 days by revenue)
  const byProd = new Map<string, { name: string; sku: string; revenue: number; qty: number }>();
  for (const s of sales30) {
    const cur = byProd.get(s.productId) || { name: s.product.name, sku: s.product.sku, revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byProd.set(s.productId, cur);
  }
  const topMovers = Array.from(byProd.entries())
    .map(([id, v]) => ({ productId: id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Inventory risk summary
  const inventory = await db.inventorySnapshot.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: { snapshotDate: 'desc' },
    take: 500,
    include: { product: true },
  });

  const seen = new Set<string>();
  const unique = inventory.filter(i => {
    if (seen.has(i.productId)) return false;
    seen.add(i.productId);
    return true;
  });

  let stockoutHigh = 0;
  let stockoutWatch = 0;
  let overstock = 0;
  let noDemandSignal = 0;
  const stockoutRiskItems: any[] = [];

  for (const inv of unique.slice(0, 200)) {
    const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
    if (risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL') {
      stockoutHigh++;
      stockoutRiskItems.push(risk);
    } else if (risk.riskLevel === 'WATCH') {
      stockoutWatch++;
    }
    // Check overstock only when demand is known
    if (risk.forecastDailyDemand > 0.1 && risk.daysOfInventory !== null) {
      if (risk.daysOfInventory > 30) overstock++;
    } else if (risk.forecastDailyDemand < 0.1 && inv.onHandQty > 0) {
      noDemandSignal++;
    }
  }

  stockoutRiskItems.sort((a, b) => b.stockoutProbability - a.stockoutProbability);

  // Pending approvals
  const pendingApprovals = await db.recommendation.count({
    where: { status: 'PENDING_REVIEW' },
  });
  const approvedRecs = await db.recommendation.count({
    where: { status: 'APPROVED' },
  });

  // Total reorder value pending
  const pendingRecs = await db.recommendation.findMany({
    where: { status: 'PENDING_REVIEW' },
  });
  const pendingReorderValue = pendingRecs.reduce((s, r) => s + (r.estimatedCost || 0), 0);

  // Upcoming festivals (next 90 days from today)
  const today = new Date();
  const next90 = new Date();
  next90.setDate(next90.getDate() + 90);
  const upcomingFestivals = await db.festival.findMany({
    where: { endDate: { gte: today }, startDate: { lte: next90 } },
    orderBy: { startDate: 'asc' },
    take: 5,
  });

  // Daily sales trend (last 14 days, anchored on data range)
  const { start: start14, end: end14 } = await getRangeStart(14);
  const recentSales = await db.sale.findMany({
    where: { saleTimestamp: { gte: start14, lte: end14 } },
  });
  const byDay = new Map<string, number>();
  for (const s of recentSales) {
    const key = s.saleTimestamp.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + s.netSales);
  }
  const salesTrend = Array.from(byDay.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    kpis: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTransactions: allSales.length,
      totalQuantity: totalQty,
      revenue30d: Math.round(totalRevenue30d * 100) / 100,
      transactions30d,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      stockoutHigh,
      stockoutWatch,
      overstock,
      noDemandSignal,
      pendingApprovals,
      approvedRecs,
      pendingReorderValue: Math.round(pendingReorderValue * 100) / 100,
    },
    topMovers,
    stockoutRiskItems: stockoutRiskItems.slice(0, 5),
    upcomingFestivals,
    salesTrend,
    period: { start: start30.toISOString(), end: end30.toISOString() },
  });
}
