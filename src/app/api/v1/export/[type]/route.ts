import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import {
  generateInventoryExport,
  generatePurchaseOrdersExport,
  generateGstExport,
  generateAbcXyzExport,
  generateSuppliersExport,
  generateTransfersExport,
  generateExpiryExport,
} from '@/lib/export';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = getRequestUser(req);
    const { type } = await params;

    let buffer: Buffer;
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = `stockpilot_${type}_${dateStr}.xlsx`;

    switch (type) {
      case 'inventory':
        buffer = await generateInventoryExport(user.tenantId);
        filename = `stockpilot_inventory_${dateStr}.xlsx`;
        break;
      case 'purchase-orders':
      case 'pos':
        buffer = await generatePurchaseOrdersExport(user.tenantId);
        filename = `stockpilot_purchase_orders_${dateStr}.xlsx`;
        break;
      case 'gst':
      case 'gst-report':
        buffer = await generateGstExport(user.tenantId);
        filename = `stockpilot_gst_report_${dateStr}.xlsx`;
        break;
      case 'abc-xyz':
        buffer = await generateAbcXyzExport(user.tenantId);
        filename = `stockpilot_abc_xyz_matrix_${dateStr}.xlsx`;
        break;
      case 'suppliers':
        buffer = await generateSuppliersExport(user.tenantId);
        filename = `stockpilot_suppliers_scorecard_${dateStr}.xlsx`;
        break;
      case 'transfers':
        buffer = await generateTransfersExport(user.tenantId);
        filename = `stockpilot_transfers_${dateStr}.xlsx`;
        break;
      case 'expiry':
      case 'batches':
        buffer = await generateExpiryExport(user.tenantId);
        filename = `stockpilot_expiry_fefo_${dateStr}.xlsx`;
        break;
      default:
        return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Export generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate export file' },
      { status: 500 }
    );
  }
}
