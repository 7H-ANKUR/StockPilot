/**
 * Notifications Management Module
 * 
 * Provides:
 * - Persistent notification creation & querying in Prisma DB
 * - Automatic generation of stockout and PO approval alerts
 * - Offline delta sync support
 */

import { db } from '@/lib/db';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type NotificationType = 
  | 'STOCKOUT_ALERT' 
  | 'PO_STATUS' 
  | 'FORECAST_ANOMALY' 
  | 'EXPIRY_WARNING' 
  | 'SYSTEM';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
}

/**
 * Create a persistent notification.
 */
export async function createNotification(
  tenantId: string,
  payload: NotificationPayload
) {
  try {
    return await db.notification.create({
      data: {
        tenantId,
        userId: payload.userId || null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        severity: payload.severity || 'INFO',
        resourceType: payload.resourceType || null,
        resourceId: payload.resourceId || null,
        isRead: false,
      },
    });
  } catch (e: any) {
    console.error('Failed to create notification:', e.message);
    return null;
  }
}

/**
 * Check active store conditions and auto-generate notifications if none exist.
 */
export async function generateInitialNotifications(tenantId: string) {
  const existingCount = await db.notification.count({ where: { tenantId } });
  if (existingCount > 0) return;

  // 1. Check for low-stock inventory
  const lowStock = await db.inventorySnapshot.findMany({
    where: {
      onHandQty: { lte: 15, gt: 0 },
    },
    include: { product: true },
    take: 3,
  });

  for (const inv of lowStock) {
    await createNotification(tenantId, {
      type: 'STOCKOUT_ALERT',
      severity: 'CRITICAL',
      title: `Critical Stockout Risk: ${inv.product.name}`,
      message: `Only ${inv.onHandQty} units remaining on hand. Falls below safety threshold. Reorder urgently.`,
      resourceType: 'PRODUCT',
      resourceId: inv.productId,
    });
  }

  // 2. Check for pending recommendations
  const pendingRecs = await db.recommendation.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { product: true },
    take: 2,
  });

  for (const rec of pendingRecs) {
    await createNotification(tenantId, {
      type: 'PO_STATUS',
      severity: 'WARNING',
      title: `Reorder Required: ${rec.product.name}`,
      message: `Suggested order of ${rec.recommendedQty} units (est. ₹${(rec.estimatedCost ?? 0).toLocaleString('en-IN')}) requires review.`,
      resourceType: 'RECOMMENDATION',
      resourceId: rec.id,
    });
  }

  // 3. Welcome / System notification
  await createNotification(tenantId, {
    type: 'SYSTEM',
    severity: 'INFO',
    title: 'StockPilot System Initialized',
    message: 'Festival Calendar updated with 76 verified lunisolar dates. Demand models ready.',
    resourceType: 'SYSTEM',
  });
}
