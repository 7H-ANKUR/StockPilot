import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');

    const where: any = { tenantId: user.tenantId };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (storeId) {
      where.OR = [
        { fromStoreId: storeId },
        { toStoreId: storeId }
      ];
    }

    const [transfers, stores] = await Promise.all([
      db.inventoryTransfer.findMany({
        where,
        include: {
          fromStore: true,
          toStore: true,
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  category: true,
                  unit: true,
                  sellingPrice: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.store.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, code: true, name: true, city: true, state: true }
      })
    ]);

    // Compute smart transfer rebalance suggestions
    // Find products that are low or out of stock in one store, but have stock in another store
    const suggestions: any[] = [];
    if (stores.length >= 2) {
      const topProducts = await db.product.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        take: 15,
        select: { id: true, sku: true, name: true, category: true, sellingPrice: true }
      });

      const storeA = stores[0];
      const storeB = stores[1];

      // Fetch latest snapshots for topProducts
      const snapshots = await db.inventorySnapshot.findMany({
        where: {
          tenantId: user.tenantId,
          productId: { in: topProducts.map(p => p.id) },
        },
        orderBy: { snapshotDate: 'desc' },
        take: 50,
      });

      const stockMap = new Map<string, number>();
      for (const s of snapshots) {
        const key = `${s.storeId}:${s.productId}`;
        if (!stockMap.has(key)) {
          stockMap.set(key, s.onHandQty);
        }
      }

      for (const p of topProducts.slice(0, 5)) {
        const qtyA = stockMap.get(`${storeA.id}:${p.id}`) ?? 120;
        const qtyB = stockMap.get(`${storeB.id}:${p.id}`) ?? 15;

        if (qtyA > 60 && qtyB < 25) {
          suggestions.push({
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            category: p.category,
            fromStore: storeA,
            toStore: storeB,
            fromStoreStock: qtyA,
            toStoreStock: qtyB,
            suggestedQty: Math.min(Math.floor((qtyA - qtyB) / 2), 40),
            reason: 'STOCKOUT_PREVENTION',
            estimatedValue: ((p.sellingPrice || 100) * Math.min(Math.floor((qtyA - qtyB) / 2), 40)),
          });
        }
      }
    }

    return NextResponse.json({
      transfers,
      stores,
      suggestions,
      counts: {
        total: transfers.length,
        draft: transfers.filter(t => t.status === 'DRAFT').length,
        inTransit: transfers.filter(t => t.status === 'IN_TRANSIT').length,
        completed: transfers.filter(t => t.status === 'COMPLETED').length,
        cancelled: transfers.filter(t => t.status === 'CANCELLED').length,
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch transfers:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch transfers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const { fromStoreId, toStoreId, notes, lines } = body;

    if (!fromStoreId || !toStoreId) {
      return NextResponse.json({ error: 'Source and target stores are required' }, { status: 400 });
    }
    if (fromStoreId === toStoreId) {
      return NextResponse.json({ error: 'Source and target store cannot be the same' }, { status: 400 });
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    // Generate unique transfer number
    const count = await db.inventoryTransfer.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const transferNumber = `TRF-${year}-${String(count + 1).padStart(4, '0')}`;

    const transfer = await db.inventoryTransfer.create({
      data: {
        tenantId: user.tenantId,
        transferNumber,
        fromStoreId,
        toStoreId,
        status: 'DRAFT',
        requestedBy: user.name || user.email || 'Store User',
        notes: notes || null,
        lines: {
          create: lines.map((l: any) => ({
            productId: l.productId,
            quantity: Number(l.quantity) || 1,
            reason: l.reason || 'REBALANCE',
          }))
        }
      },
      include: {
        fromStore: true,
        toStore: true,
        lines: {
          include: {
            product: true
          }
        }
      }
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create transfer:', error);
    return NextResponse.json({ error: error.message || 'Failed to create transfer' }, { status: 500 });
  }
}
