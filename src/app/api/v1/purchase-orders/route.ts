import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function resolveUserId(userId: string, tenantId: string): Promise<string | undefined> {
  if (userId && userId !== 'demo-user') {
    const u = await db.user.findUnique({ where: { id: userId } });
    if (u) return userId;
  }
  const manager = await db.user.findFirst({ where: { tenantId, role: 'MANAGER' } });
  if (manager) return manager.id;
  const any = await db.user.findFirst({ where: { tenantId } });
  return any?.id;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  const pos = await db.purchaseOrder.findMany({
    where: status ? { status } : {},
    include: {
      supplier: true,
      store: true,
      lines: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({
    count: pos.length,
    purchaseOrders: pos,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { supplierId, userId } = await req.json();

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 });
    }

    // Find approved recommendations for this supplier
    const approvedRecs = await db.recommendation.findMany({
      where: { supplierId, status: 'APPROVED' },
      include: { product: true },
    });

    if (approvedRecs.length === 0) {
      return NextResponse.json({
        error: 'No APPROVED recommendations found for this supplier. Approve recommendations first.',
      }, { status: 400 });
    }

    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const actualUserId = await resolveUserId(userId || 'demo-user', supplier.tenantId);

    const poCount = await db.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, '0')}`;

    let subtotal = 0;
    let taxAmount = 0;
    const lines: any[] = [];

    for (const rec of approvedRecs) {
      const sp = await db.supplierProduct.findFirst({
        where: { supplierId, productId: rec.productId },
      });
      if (!sp) continue;

      const lineSubtotal = rec.recommendedQty * sp.unitCost;
      const lineTax = lineSubtotal * (rec.product.gstRate / 100);
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      lines.push({
        productId: rec.productId,
        recommendationId: rec.id,
        quantity: rec.recommendedQty,
        unitPrice: sp.unitCost,
        subtotal: lineSubtotal,
        taxAmount: lineTax,
        gstRate: rec.product.gstRate,
      });
    }

    const total = subtotal + taxAmount;

    const po = await db.purchaseOrder.create({
      data: {
        poNumber,
        tenantId: supplier.tenantId,
        supplierId,
        storeId: process.env.DEFAULT_STORE_ID || 'store-default',
        status: 'DRAFT',
        currency: 'INR',
        subtotal,
        taxAmount,
        estimatedTotal: total,
        lines: { create: lines },
      },
      include: { lines: { include: { product: true } }, supplier: true },
    });

    await db.recommendation.updateMany({
      where: { id: { in: approvedRecs.map(r => r.id) } },
      data: { status: 'PO_GENERATED' },
    });

    await db.auditEvent.create({
      data: {
        tenantId: supplier.tenantId,
        userId: actualUserId,
        action: 'PO_CREATED',
        resourceType: 'PURCHASE_ORDER',
        resourceId: po.id,
        newValue: JSON.stringify({ poNumber, supplierId, total, lineCount: lines.length }),
        source: 'PO_API',
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
