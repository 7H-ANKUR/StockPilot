import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeStockoutRisk, computeOverstock } from '@/lib/inventory';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function GET() {
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
  
  const stockoutRisks: any[] = [];
  const overstockRisks: any[] = [];
  
  for (const inv of unique.slice(0, 200)) {
    const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
    if (risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL') {
      stockoutRisks.push(risk);
    }
    const over = await computeOverstock(inv.productId, DEFAULT_STORE_ID);
    if (over.isOverstock) {
      overstockRisks.push(over);
    }
  }
  
  stockoutRisks.sort((a, b) => b.stockoutProbability - a.stockoutProbability);
  overstockRisks.sort((a, b) => b.daysOfInventory - a.daysOfInventory);
  
  return NextResponse.json({
    stockoutRisks: stockoutRisks.slice(0, 20),
    overstockRisks: overstockRisks.slice(0, 20),
    summary: {
      totalStockoutHigh: stockoutRisks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
      totalOverstock: overstockRisks.length,
    },
  });
}
