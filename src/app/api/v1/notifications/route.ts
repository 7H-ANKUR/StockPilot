import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/auth';
import { generateInitialNotifications } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Auto-generate initial alerts if empty
    await generateInitialNotifications(user.tenantId);

    const whereClause: any = {
      tenantId: user.tenantId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, totalUnread] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.notification.count({
        where: { tenantId: user.tenantId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      totalUnread,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const { ids, all } = body;

    if (all) {
      await db.notification.updateMany({
        where: { tenantId: user.tenantId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      await db.notification.updateMany({
        where: { tenantId: user.tenantId, id: { in: ids } },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'Notifications marked as read' });
    }

    return NextResponse.json({ error: 'ids array or all: true is required' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await db.notification.deleteMany({
        where: { id, tenantId: user.tenantId },
      });
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    }

    // Default: Clear all read notifications
    await db.notification.deleteMany({
      where: { tenantId: user.tenantId, isRead: true },
    });

    return NextResponse.json({ success: true, message: 'Read notifications cleared' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
