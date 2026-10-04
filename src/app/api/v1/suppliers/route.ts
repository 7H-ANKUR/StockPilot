import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-default';

export async function GET() {
  const suppliers = await db.supplier.findMany({
    where: { tenantId: DEFAULT_TENANT_ID },
    include: {
      supplierProducts: { include: { product: true } },
      purchaseOrders: true,
    },
  });
  
  const result = suppliers.map(s => ({
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
  }));
  
  return NextResponse.json({ count: result.length, suppliers: result });
}
