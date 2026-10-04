import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser, requirePermission } from '@/lib/auth';
import { z } from 'zod';

const UpdateSupplierSchema = z.object({
  name: z.string().min(2).optional(),
  gstin: z.string().optional().nullable(),
  leadTimeDays: z.number().min(1).max(60).optional(),
  minOrderQty: z.number().min(1).optional(),
  reliabilityScore: z.number().min(0).max(1).optional(),
  paymentTerms: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getRequestUser(req);

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        supplierProducts: {
          include: { product: true },
          orderBy: { preferred: 'desc' },
        },
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!supplier || supplier.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = requirePermission(req, 'MANAGE_SUPPLIERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = UpdateSupplierSchema.parse(body);
    const user = permCheck.user;

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updated = await db.supplier.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ supplier: updated });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = requirePermission(req, 'MANAGE_SUPPLIERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const { id } = await params;
    const user = permCheck.user;

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check if supplier has active purchase orders
    const poCount = await db.purchaseOrder.count({
      where: { supplierId: id, status: { notIn: ['FULFILLED', 'CANCELLED'] } },
    });

    if (poCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with active/pending purchase orders' },
        { status: 400 }
      );
    }

    // Delete supplier products mappings first
    await db.supplierProduct.deleteMany({ where: { supplierId: id } });
    await db.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Supplier removed' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
