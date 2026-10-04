import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeStockoutRisk, computeOverstock, getMovementLabel, computeMovementClass } from '@/lib/inventory';
import { getDailySalesSeries } from '@/lib/forecast';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  
  // Get latest inventory per product
  const inventory = await db.inventorySnapshot.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: { snapshotDate: 'desc' },
    take: 500,
    include: { product: true },
  });
  
  // Dedupe
  const seen = new Set<string>();
  let unique = inventory.filter(i => {
    if (seen.has(i.productId)) return false;
    seen.add(i.productId);
    return true;
  });
  
  // Filter
  if (search) {
    unique = unique.filter(i =>
      i.product.name.toLowerCase().includes(search.toLowerCase()) ||
      i.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (i.product.category || '').toLowerCase().includes(search.toLowerCase())
    );
  }
  if (category) {
    unique = unique.filter(i => i.product.category === category);
  }
  
  const items = [];
  for (const inv of unique.slice(0, limit)) {
    const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
    const series = await getDailySalesSeries(inv.productId, DEFAULT_STORE_ID, 28);
    const avgDaily = series.slice(-7).reduce((s, x) => s + x.qty, 0) / 7;
    const movementClass = computeMovementClass(series.map(s => s.qty), inv.onHandQty);
    const movementLabel = getMovementLabel(movementClass);
    
    items.push({
      productId: inv.productId,
      sku: inv.product.sku,
      name: inv.product.name,
      brand: inv.product.brand,
      category: inv.product.category,
      subcategory: inv.product.subcategory,
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
    });
  }
  
  // Categories for filter
  const categories = Array.from(new Set(inventory.map(i => i.product.category).filter(Boolean))) as string[];
  
  return NextResponse.json({
    count: items.length,
    categories,
    items,
  });
}
