import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(req);
    const { id } = await params;

    const transfer = await db.inventoryTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
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

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transfer' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(req);
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    const validStatuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await db.inventoryTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { lines: true, fromStore: true, toStore: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status) {
      updateData.status = status;
      if (status === 'IN_TRANSIT') {
        updateData.approvedBy = user.name || user.email || 'Manager';
      }
      if (status === 'COMPLETED') {
        updateData.completedDate = new Date();

        // Rebalance stock in inventory snapshots
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const line of existing.lines) {
          // Find source store snapshot or create adjustment
          const sourceSnap = await db.inventorySnapshot.findFirst({
            where: {
              tenantId: user.tenantId,
              storeId: existing.fromStoreId,
              productId: line.productId,
            },
            orderBy: { snapshotDate: 'desc' }
          });

          if (sourceSnap) {
            await db.inventorySnapshot.update({
              where: { id: sourceSnap.id },
              data: { onHandQty: Math.max(0, sourceSnap.onHandQty - line.quantity) }
            });
          }

          // Find target store snapshot or create adjustment
          const targetSnap = await db.inventorySnapshot.findFirst({
            where: {
              tenantId: user.tenantId,
              storeId: existing.toStoreId,
              productId: line.productId,
            },
            orderBy: { snapshotDate: 'desc' }
          });

          if (targetSnap) {
            await db.inventorySnapshot.update({
              where: { id: targetSnap.id },
              data: { onHandQty: targetSnap.onHandQty + line.quantity }
            });
          } else {
            // Create initial snapshot for target store if none exists
            await db.inventorySnapshot.create({
              data: {
                tenantId: user.tenantId,
                storeId: existing.toStoreId,
                productId: line.productId,
                snapshotDate: today,
                onHandQty: line.quantity,
                reorderPoint: 20,
                maxStock: 200,
              }
            });
          }
        }

        // Send notification
        await createNotification({
          tenantId: user.tenantId,
          type: 'STOCKOUT_ALERT',
          title: `Transfer ${existing.transferNumber} Completed`,
          message: `${existing.lines.length} items successfully transferred from ${existing.fromStore.name} to ${existing.toStore.name}.`,
          severity: 'INFO',
          resourceType: 'TRANSFER',
          resourceId: existing.id,
        }).catch(() => {});
      }
    }

    const updated = await db.inventoryTransfer.update({
      where: { id },
      data: updateData,
      include: {
        fromStore: true,
        toStore: true,
        lines: {
          include: { product: true }
        }
      }
    });

    return NextResponse.json({ transfer: updated });
  } catch (error: any) {
    console.error('Failed to update transfer:', error);
    return NextResponse.json({ error: error.message || 'Failed to update transfer' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(req);
    const { id } = await params;

    const existing = await db.inventoryTransfer.findFirst({
      where: { id, tenantId: user.tenantId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Only DRAFT or CANCELLED transfers can be deleted' }, { status: 400 });
    }

    await db.inventoryTransfer.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Transfer deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete transfer' }, { status: 500 });
  }
}
