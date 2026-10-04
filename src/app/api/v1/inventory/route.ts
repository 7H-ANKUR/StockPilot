import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeStockoutRisk, computeOverstock, getMovementLabel, computeMovementClass } from '@/lib/inventory';
import { getDailySalesSeries } from '@/lib/forecast';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const brand = url.searchParams.get('brand') || '';

  const whereProduct: any = {};
  if (brand) {
    if (brand === 'Other / Unspecified' || brand === 'unspecified') {
      whereProduct.OR = [
        { brand: null },
        { brand: '' },
        { brand: 'Other / Unspecified' },
      ];
    } else {
      whereProduct.brand = brand;
    }
  }

  // Get inventory snapshots matching store and optional brand
  const inventory = await db.inventorySnapshot.findMany({
    where: {
      storeId: DEFAULT_STORE_ID,
      ...(brand ? { product: whereProduct } : {}),
    },
    orderBy: { snapshotDate: 'desc' },
    take: brand ? 500 : 500,
    include: { product: true },
  });

  // Dedupe by productId
  const seen = new Set<string>();
  let unique = inventory.filter(i => {
    if (!i.product) return false;
    if (seen.has(i.productId)) return false;
    seen.add(i.productId);
    return true;
  });

  // Filter by category
  if (category && category !== 'all') {
    unique = unique.filter(i => i.product.category === category);
  }

  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    unique = unique.filter(i =>
      i.product.name.toLowerCase().includes(q) ||
      i.product.sku.toLowerCase().includes(q) ||
      (i.product.category || '').toLowerCase().includes(q) ||
      (i.product.subcategory || '').toLowerCase().includes(q) ||
      (i.product.brand || '').toLowerCase().includes(q)
    );
  }

  // Categories for this brand/dataset
  const categories = Array.from(new Set(inventory.map(i => i.product.category).filter(Boolean))) as string[];

  // Process items in parallel for snappy response
  const targetItems = unique.slice(0, limit);
  const items = await Promise.all(
    targetItems.map(async (inv) => {
      try {
        const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
        const series = await getDailySalesSeries(inv.productId, DEFAULT_STORE_ID, 28);
        const movementClass = computeMovementClass(series.map(s => s.qty), inv.onHandQty);
        const movementLabel = getMovementLabel(movementClass);

        return {
          productId: inv.productId,
          sku: inv.product.sku,
          name: inv.product.name,
          brand: inv.product.brand || 'Other / Unspecified',
          category: inv.product.category || 'General',
          subcategory: inv.product.subcategory || '',
          sellingPrice: inv.product.sellingPrice,
          mrp: inv.product.mrp,
          gstRate: inv.product.gstRate,
          onHandQty: inv.onHandQty,
          availableStock: risk.availableStock,
          reorderPoint: inv.reorderPoint,
          maxStock: inv.maxStock,
          daysOfInventory: risk.daysOfInventory,
          forecastAvailable: risk.forecastAvailable,
          riskLevel: risk.riskLevel,
          stockoutProbability: risk.stockoutProbability,
          forecastDailyDemand: risk.forecastDailyDemand,
          movementClass,
          movementLabel: movementLabel.fast,
          movementDescription: movementLabel.description,
          sparkline: series.slice(-14).map(s => s.qty),
        };
      } catch (err) {
        return {
          productId: inv.productId,
          sku: inv.product.sku,
          name: inv.product.name,
          brand: inv.product.brand || 'Other / Unspecified',
          category: inv.product.category || 'General',
          subcategory: inv.product.subcategory || '',
          sellingPrice: inv.product.sellingPrice,
          mrp: inv.product.mrp,
          gstRate: inv.product.gstRate,
          onHandQty: inv.onHandQty,
          availableStock: inv.onHandQty,
          reorderPoint: inv.reorderPoint,
          maxStock: inv.maxStock,
          daysOfInventory: null,
          forecastAvailable: false,
          riskLevel: 'SAFE',
          stockoutProbability: 0,
          forecastDailyDemand: 1.0,
          movementClass: 'SLOW',
          movementLabel: 'slow',
          movementDescription: 'Stable velocity',
          sparkline: [1, 1, 2, 1, 0, 1, 1],
        };
      }
    })
  );

  return NextResponse.json({
    brand: brand || null,
    count: items.length,
    totalAvailable: unique.length,
    categories,
    items,
  });
}

