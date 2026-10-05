import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');
    const productId = searchParams.get('productId');

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: any = { tenantId: user.tenantId };
    if (storeId) where.storeId = storeId;
    if (productId) where.productId = productId;

    if (status && status !== 'ALL') {
      if (status === 'EXPIRED') {
        where.expiryDate = { lt: now };
      } else if (status === 'EXPIRING_SOON') {
        where.expiryDate = { gte: now, lte: sevenDaysLater };
      } else if (status === 'ACTIVE') {
        where.expiryDate = { gt: sevenDaysLater };
      } else {
        where.status = status;
      }
    }

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
            unit: true,
          }
        },
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    // Auto-normalize statuses based on current date
    const enrichedBatches = batches.map(b => {
      const exp = new Date(b.expiryDate);
      const diffTime = exp.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let computedStatus = b.status;
      if (b.status !== 'WRITTEN_OFF' && b.status !== 'CONSUMED') {
        if (daysLeft < 0) {
          computedStatus = 'EXPIRED';
        } else if (daysLeft <= 7) {
          computedStatus = 'EXPIRING_SOON';
        } else {
          computedStatus = 'ACTIVE';
        }
      }

      return {
        ...b,
        daysLeft,
        computedStatus,
        batchValue: +(b.quantity * b.costPrice).toFixed(2),
      };
    });

    return NextResponse.json({ batches: enrichedBatches });
  } catch (error: any) {
    console.error('Failed to fetch inventory batches:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch inventory batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const { storeId, productId, batchNumber, quantity, costPrice, manufactureDate, expiryDate } = body;

    if (!storeId || !productId || !batchNumber || !expiryDate) {
      return NextResponse.json({ error: 'Store, Product, Batch Number, and Expiry Date are required' }, { status: 400 });
    }

    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status = 'ACTIVE';
    if (diffDays < 0) status = 'EXPIRED';
    else if (diffDays <= 7) status = 'EXPIRING_SOON';

    const batch = await db.inventoryBatch.create({
      data: {
        tenantId: user.tenantId,
        storeId,
        productId,
        batchNumber,
        quantity: Number(quantity) || 1,
        costPrice: Number(costPrice) || 0,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
        expiryDate: exp,
        status,
      },
      include: {
        product: true,
        store: true,
      }
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create batch:', error);
    return NextResponse.json({ error: error.message || 'Failed to create batch' }, { status: 500 });
  }
}
