import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRangeStart } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30');

  // Anchor on the latest sale date in DB, not on today.
  // The retail datasets are historical (2014-2018), so "last 30 days from today"
  // would return zero rows.
  const { start, end } = await getRangeStart(days);

  const sales = await db.sale.findMany({
    where: { saleTimestamp: { gte: start, lte: end } },
    include: { product: true },
  });

  const totalRevenue = sales.reduce((s, x) => s + x.netSales, 0);
  const totalQuantity = sales.reduce((s, x) => s + x.quantity, 0);
  const transactions = sales.length;

  // Daily series
  const byDay = new Map<string, { revenue: number; qty: number }>();
  for (const s of sales) {
    const key = s.saleTimestamp.toISOString().slice(0, 10);
    const cur = byDay.get(key) || { revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byDay.set(key, cur);
  }
  const dailySeries = Array.from(byDay.entries())
    .map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, qty: v.qty }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // By category
  const byCat = new Map<string, { revenue: number; qty: number }>();
  for (const s of sales) {
    const c = s.product.category || 'Unknown';
    const cur = byCat.get(c) || { revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byCat.set(c, cur);
  }
  const byCategory = Array.from(byCat.entries())
    .map(([cat, v]) => ({ category: cat, revenue: Math.round(v.revenue * 100) / 100, qty: v.qty }))
    .sort((a, b) => b.revenue - a.revenue);

  // By region
  const byReg = new Map<string, { revenue: number; qty: number }>();
  for (const s of sales) {
    const r = s.region || 'Unknown';
    const cur = byReg.get(r) || { revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byReg.set(r, cur);
  }
  const byRegion = Array.from(byReg.entries())
    .map(([region, v]) => ({ region, revenue: Math.round(v.revenue * 100) / 100, qty: v.qty }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top products
  const byProd = new Map<string, { name: string; sku: string; revenue: number; qty: number }>();
  for (const s of sales) {
    const cur = byProd.get(s.productId) || { name: s.product.name, sku: s.product.sku, revenue: 0, qty: 0 };
    cur.revenue += s.netSales;
    cur.qty += s.quantity;
    byProd.set(s.productId, cur);
  }
  const topProducts = Array.from(byProd.entries())
    .map(([id, v]) => ({ productId: id, ...v, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Distinguish "no data" from "genuine zero"
  const hasData = transactions > 0;

  return NextResponse.json({
    days,
    period: { start: start.toISOString(), end: end.toISOString() },
    hasData,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalQuantity,
    transactions,
    avgOrderValue: transactions > 0 ? Math.round((totalRevenue / transactions) * 100) / 100 : 0,
    dailySeries,
    byCategory,
    byRegion,
    topProducts,
  });
}
