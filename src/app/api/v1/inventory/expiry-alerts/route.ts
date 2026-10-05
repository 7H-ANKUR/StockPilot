import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    const where: any = { tenantId: user.tenantId };
    if (storeId) where.storeId = storeId;

    const batches = await db.inventoryBatch.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            sellingPrice: true,
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const now = new Date();

    let expiredCount = 0;
    let expiredValue = 0;
    let criticalCount = 0;
    let criticalValue = 0;
    let warningCount = 0;
    let warningValue = 0;
    let safeCount = 0;
    let safeValue = 0;

    const fefoMap = new Map<string, any>();
    const categoryRiskMap = new Map<string, { expired: number; critical: number; safe: number; totalValue: number }>();

    for (const b of batches) {
      if (b.status === 'WRITTEN_OFF' || b.status === 'CONSUMED') continue;

      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const value = +(b.quantity * b.costPrice).toFixed(2);
      const cat = b.product.category || 'General';

      if (!categoryRiskMap.has(cat)) {
        categoryRiskMap.set(cat, { expired: 0, critical: 0, safe: 0, totalValue: 0 });
      }
      const catStat = categoryRiskMap.get(cat)!;
      catStat.totalValue += value;

      if (diffDays < 0) {
        expiredCount++;
        expiredValue += value;
        catStat.expired++;
      } else if (diffDays <= 7) {
        criticalCount++;
        criticalValue += value;
        catStat.critical++;
      } else if (diffDays <= 30) {
        warningCount++;
        warningValue += value;
        catStat.critical++;
      } else {
        safeCount++;
        safeValue += value;
        catStat.safe++;
      }

      // Group for FEFO queue
      if (!fefoMap.has(b.productId)) {
        fefoMap.set(b.productId, {
          productId: b.productId,
          productName: b.product.name,
          sku: b.product.sku,
          category: b.product.category,
          batches: [],
          earliestExpiry: b.expiryDate,
          totalStock: 0,
        });
      }
      const pEntry = fefoMap.get(b.productId)!;
      pEntry.batches.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        storeName: b.store.name,
        quantity: b.quantity,
        costPrice: b.costPrice,
        expiryDate: b.expiryDate,
        daysLeft: diffDays,
        actionRecommendation: diffDays < 0 
          ? 'Immediate Write-Off / Supplier Credit Claim'
          : diffDays <= 3
          ? 'Urgent Clearance: 40% Bundle Discount'
          : diffDays <= 7
          ? 'Promote Front Display: 20% Markdown'
          : 'Standard FEFO Rotation',
      });
      pEntry.totalStock += b.quantity;
    }

    const fefoQueue = Array.from(fefoMap.values())
      .filter(p => p.batches.some((b: any) => b.daysLeft <= 14))
      .sort((a, b) => new Date(a.earliestExpiry).getTime() - new Date(b.earliestExpiry).getTime())
      .slice(0, 10);

    const categoryBreakdown = Array.from(categoryRiskMap.entries()).map(([category, stats]) => ({
      category,
      ...stats,
      totalValue: +stats.totalValue.toFixed(2),
    }));

    return NextResponse.json({
      summary: {
        totalBatches: batches.length,
        expired: { count: expiredCount, value: +expiredValue.toFixed(2) },
        critical: { count: criticalCount, value: +criticalValue.toFixed(2) },
        warning: { count: warningCount, value: +warningValue.toFixed(2) },
        safe: { count: safeCount, value: +safeValue.toFixed(2) },
      },
      fefoQueue,
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error('Failed to compute expiry alerts:', error);
    return NextResponse.json({ error: error.message || 'Failed to compute expiry alerts' }, { status: 500 });
  }
}
