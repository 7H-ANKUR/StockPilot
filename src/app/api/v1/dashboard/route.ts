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
  // All-time totals (no date filter)
  const allSales = await db.sale.findMany({ select: { netSales: true, quantity: true, saleTimestamp: true } });
  const totalRevenue = allSales.reduce((s, x) => s + x.netSales, 0);
  const totalQty = allSales.reduce((s, x) => s + x.quantity, 0);
  const totalTransactions = allSales.length;

  // Average Order Value = Total Revenue / Completed Transactions
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const avgOrderValue30d = transactions30d > 0 ? totalRevenue30d / transactions30d : 0;

  // Top movers (last 30 days by revenue)
  const byProd = new Map<string, { name: string; sku: string; revenue: number; qty: number }>();
  for (const s of sales30) {
    if (!s.product) continue;
    const cur = byProd.get(s.productId) || { name: s.product.name, sku: s.product.sku, revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byProd.set(s.productId, cur);
  }
  const topMovers = Array.from(byProd.entries())
    .map(([id, v]) => ({ productId: id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Fast, accurate stockout & risk count across catalog
  const inventoryCounts: any = await db.$queryRawUnsafe(`
    SELECT 
      SUM(CASE WHEN i.onHandQty <= 0 THEN 1 ELSE 0 END) as outOfStock,
      SUM(CASE WHEN i.onHandQty > 0 AND i.onHandQty <= COALESCE(i.reorderPoint, 15) THEN 1 ELSE 0 END) as lowStock,
      SUM(CASE WHEN i.onHandQty > COALESCE(i.reorderPoint, 15) AND i.onHandQty <= COALESCE(i.reorderPoint, 15) * 1.3 THEN 1 ELSE 0 END) as watchStock,
      SUM(CASE WHEN i.onHandQty > COALESCE(i.maxStock, 100) THEN 1 ELSE 0 END) as overStock
    FROM InventorySnapshot i
    JOIN Product p ON i.productId = p.id
  `);

  const invStats = inventoryCounts[0] || {};
  const stockoutHigh = Number(invStats.outOfStock || 0);
  const stockoutLow = Number(invStats.lowStock || 0);
  const stockoutWatch = Number(invStats.watchStock || 0);
  const overstock = Number(invStats.overStock || 0);

  // Top stockout risk items for preview
  const topRiskRaw: any = await db.$queryRawUnsafe(`
    SELECT 
      p.id as productId,
      p.sku,
      p.name as productName,
      p.brand,
      i.onHandQty as currentStock,
      COALESCE(i.reorderPoint, 15) as reorderPoint
    FROM Product p
    JOIN InventorySnapshot i ON p.id = i.productId
    WHERE i.onHandQty <= COALESCE(i.reorderPoint, 15)
    ORDER BY i.onHandQty ASC
    LIMIT 6
  `);

  const stockoutRiskItems = topRiskRaw.map((r: any) => {
    const currentStock = Number(r.currentStock || 0);
    const reorderPoint = Number(r.reorderPoint || 15);
    const leadTimeDemand = Math.max(1, Math.round(reorderPoint * 0.7 * 10) / 10);
    const expectedDaysToStockout = currentStock <= 0 ? 0 : Math.max(1, Math.round(currentStock / Math.max(1, leadTimeDemand / 5)));
    const riskLevel = currentStock <= 0 ? 'CRITICAL' : currentStock <= 5 ? 'HIGH' : 'MEDIUM';
    const stockoutProbability = currentStock <= 0 ? 0.99 : currentStock <= 5 ? 0.88 : 0.65;

    return {
      productId: r.productId,
      sku: r.sku,
      productName: r.productName,
      brand: r.brand,
      currentStock,
      availableStock: currentStock,
      reorderPoint,
      leadTimeDemand,
      expectedDaysToStockout,
      riskLevel,
      stockoutProbability,
    };
  });


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
      avgOrderValue30d: Math.round(avgOrderValue30d * 100) / 100,
      stockoutHigh,
      stockoutLow,
      stockoutWatch,
      overstock,
      noDemandSignal: 0,
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
