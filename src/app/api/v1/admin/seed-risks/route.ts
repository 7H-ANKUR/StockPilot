import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

export async function POST() {
  const inventory = await db.inventorySnapshot.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    include: { product: true },
    orderBy: { snapshotDate: 'desc' },
  });

  const seen = new Set<string>();
  const unique = inventory.filter(i => {
    if (seen.has(i.productId)) return false;
    seen.add(i.productId);
    return true;
  });

  let lowStock = 0;
  let overstock = 0;
  let healthy = 0;

  let seed = 99;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (const inv of unique) {
    const roll = rng();
    const salesCount = await db.sale.count({ where: { productId: inv.productId } });
    const baseDemand = Math.max(1, Math.round(salesCount / 60));

    if (roll < 0.40) {
      // Low stock
      const daysStock = Math.floor(rng() * 3);
      const newQty = Math.max(0, baseDemand * daysStock);
      await db.inventorySnapshot.update({
        where: { id: inv.id },
        data: {
          onHandQty: newQty,
          reservedQty: Math.round(newQty * 0.1),
        },
      });
      lowStock++;
    } else if (roll < 0.60) {
      // Overstock
      const daysStock = 50 + Math.floor(rng() * 70);
      const newQty = baseDemand * daysStock;
      await db.inventorySnapshot.update({
        where: { id: inv.id },
        data: {
          onHandQty: newQty,
          reservedQty: Math.round(newQty * 0.05),
        },
      });
      overstock++;
    } else {
      healthy++;
    }
  }

  return NextResponse.json({
    success: true,
    lowStock,
    overstock,
    healthy,
    total: unique.length,
  });
}
