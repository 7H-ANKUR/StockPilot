import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRangeStart } from '@/lib/dates';

interface ProductMetric {
  productId: string;
  name: string;
  sku: string;
  category: string;
  revenue: number;
  quantity: number;
  cv: number; // Coefficient of Variation
  abcClass: 'A' | 'B' | 'C';
  xyzClass: 'X' | 'Y' | 'Z';
  matrixClass: string;
  recommendedPolicy: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    const { start, end } = await getRangeStart(days);

    // Fetch sales grouped by product
    const sales = await db.sale.findMany({
      where: { saleTimestamp: { gte: start, lte: end } },
      include: { product: true },
    });

    // Group by product
    const productSalesMap = new Map<string, {
      product: any;
      totalRevenue: number;
      totalQuantity: number;
      dailyMap: Map<string, number>;
    }>();

    for (const s of sales) {
      if (!productSalesMap.has(s.productId)) {
        productSalesMap.set(s.productId, {
          product: s.product,
          totalRevenue: 0,
          totalQuantity: 0,
          dailyMap: new Map(),
        });
      }
      const entry = productSalesMap.get(s.productId)!;
      entry.totalRevenue += s.netSales;
      entry.totalQuantity += s.quantity;

      const dayKey = s.saleTimestamp.toISOString().slice(0, 10);
      entry.dailyMap.set(dayKey, (entry.dailyMap.get(dayKey) || 0) + s.quantity);
    }

    // Also include products with 0 sales
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      take: 200,
    });

    for (const p of allProducts) {
      if (!productSalesMap.has(p.id)) {
        productSalesMap.set(p.id, {
          product: p,
          totalRevenue: 0,
          totalQuantity: 0,
          dailyMap: new Map(),
        });
      }
    }

    // Compute CV for each product
    const totalRevenueAll = Array.from(productSalesMap.values()).reduce((s, x) => s + x.totalRevenue, 0);

    const intermediate: Array<{
      productId: string;
      name: string;
      sku: string;
      category: string;
      revenue: number;
      quantity: number;
      cv: number;
      xyzClass: 'X' | 'Y' | 'Z';
    }> = [];

    for (const [prodId, data] of productSalesMap.entries()) {
      const dailyVals = Array.from(data.dailyMap.values());
      let cv = 2.0; // Default high volatility if no history

      if (dailyVals.length >= 3) {
        const mean = dailyVals.reduce((a, b) => a + b, 0) / days;
        if (mean > 0) {
          const variance = dailyVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / days;
          const stdDev = Math.sqrt(variance);
          cv = stdDev / mean;
        }
      }

      let xyzClass: 'X' | 'Y' | 'Z' = 'Z';
      if (cv <= 0.6) {
        xyzClass = 'X';
      } else if (cv <= 1.2) {
        xyzClass = 'Y';
      } else {
        xyzClass = 'Z';
      }

      intermediate.push({
        productId: prodId,
        name: data.product.name,
        sku: data.product.sku,
        category: data.product.category || 'General',
        revenue: Math.round(data.totalRevenue),
        quantity: Math.round(data.totalQuantity),
        cv: Math.round(cv * 100) / 100,
        xyzClass,
      });
    }

    // Sort descending by revenue for Pareto ABC
    intermediate.sort((a, b) => b.revenue - a.revenue);

    let cumulativeRevenue = 0;
    const classified: ProductMetric[] = intermediate.map(item => {
      cumulativeRevenue += item.revenue;
      const cumPct = totalRevenueAll > 0 ? (cumulativeRevenue / totalRevenueAll) * 100 : 100;

      let abcClass: 'A' | 'B' | 'C' = 'C';
      if (cumPct <= 75 || intermediate.indexOf(item) < intermediate.length * 0.15) {
        abcClass = 'A';
      } else if (cumPct <= 92 || intermediate.indexOf(item) < intermediate.length * 0.45) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }

      const matrixClass = `${abcClass}${item.xyzClass}`;

      let recommendedPolicy = '';
      switch (matrixClass) {
        case 'AX':
          recommendedPolicy = 'Automate reorder. High value, constant demand. Lean safety buffer.';
          break;
        case 'AY':
          recommendedPolicy = 'High value, seasonal surge. Align with festival calendar.';
          break;
        case 'AZ':
          recommendedPolicy = 'High revenue, volatile demand. Close manager review. Avoid overstocking.';
          break;
        case 'BX':
          recommendedPolicy = 'Batch reorders with fixed review cycles. Low risk.';
          break;
        case 'BY':
          recommendedPolicy = 'Dynamic safety stock buffer. Review monthly.';
          break;
        case 'BZ':
          recommendedPolicy = 'High volatility. Short lead-time supplier agreements.';
          break;
        case 'CX':
          recommendedPolicy = 'Bulk order to hit supplier discounts / MOQ. Low management effort.';
          break;
        case 'CY':
          recommendedPolicy = 'Order in medium batches. Review before major season.';
          break;
        case 'CZ':
          recommendedPolicy = 'Candidate for phase-out or order-on-demand only. Dead-stock risk.';
          break;
      }

      return {
        ...item,
        abcClass,
        matrixClass,
        recommendedPolicy,
      };
    });

    // 9-cell summary matrix counts
    const matrixCounts: Record<string, { count: number; totalRevenue: number; pctRevenue: number }> = {};
    const cells = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'];
    cells.forEach(c => {
      matrixCounts[c] = { count: 0, totalRevenue: 0, pctRevenue: 0 };
    });

    for (const item of classified) {
      if (matrixCounts[item.matrixClass]) {
        matrixCounts[item.matrixClass].count++;
        matrixCounts[item.matrixClass].totalRevenue += item.revenue;
      }
    }

    cells.forEach(c => {
      matrixCounts[c].pctRevenue = totalRevenueAll > 0
        ? Math.round((matrixCounts[c].totalRevenue / totalRevenueAll) * 100)
        : 0;
    });

    return NextResponse.json({
      summary: {
        totalProducts: classified.length,
        totalRevenue: totalRevenueAll,
        matrix: matrixCounts,
      },
      products: classified,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
