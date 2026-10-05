import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser, requirePermission } from '@/lib/auth';
import { z } from 'zod';

const SupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  code: z.string().min(2, 'Supplier code is required'),
  gstin: z.string().optional().nullable(),
  leadTimeDays: z.number().min(1).max(60).default(3),
  minOrderQty: z.number().min(1).default(1),
  reliabilityScore: z.number().min(0).max(1).default(0.9),
  paymentTerms: z.string().default('Net 30'),
});

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const suppliers = await db.supplier.findMany({
      where: { tenantId: user.tenantId },
      include: {
        supplierProducts: { include: { product: true } },
        purchaseOrders: true,
      },
      orderBy: { reliabilityScore: 'desc' },
    });

    const result = suppliers.map(s => {
      const totalSpend = s.purchaseOrders
        .filter(po => po.status !== 'CANCELLED')
        .reduce((sum, po) => sum + (po.estimatedTotal || 0), 0);

      const fulfilledCount = s.purchaseOrders.filter(po => po.status === 'FULFILLED').length;
      const otifRate = s.purchaseOrders.length > 0 
        ? Math.round((fulfilledCount / s.purchaseOrders.length) * 100) 
        : Math.round(s.reliabilityScore * 100);

      let grade = 'B';
      if (s.reliabilityScore >= 0.95 && s.leadTimeDays <= 3) grade = 'A+';
      else if (s.reliabilityScore >= 0.90) grade = 'A';
      else if (s.reliabilityScore >= 0.80) grade = 'B';
      else if (s.reliabilityScore >= 0.70) grade = 'C';
      else grade = 'D';

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        gstin: s.gstin,
        leadTimeDays: s.leadTimeDays,
        minOrderQty: s.minOrderQty,
        reliabilityScore: s.reliabilityScore,
        paymentTerms: s.paymentTerms,
        productCount: s.supplierProducts.length,
        poCount: s.purchaseOrders.length,
        totalSpend,
        otifRate,
        grade,
      };
    });

    return NextResponse.json({ count: result.length, suppliers: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permCheck = requirePermission(req, 'MANAGE_SUPPLIERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const body = await req.json();
    const validated = SupplierSchema.parse(body);
    const user = permCheck.user;

    const existing = await db.supplier.findFirst({
      where: { tenantId: user.tenantId, code: validated.code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Supplier code already exists' }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: {
        tenantId: user.tenantId,
        code: validated.code.toUpperCase(),
        name: validated.name,
        gstin: validated.gstin,
        leadTimeDays: validated.leadTimeDays,
        minOrderQty: validated.minOrderQty,
        reliabilityScore: validated.reliabilityScore,
        paymentTerms: validated.paymentTerms,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues?.[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
