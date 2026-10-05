import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser, requirePermission, UserRole } from '@/lib/auth';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'OWNER', 'MANAGER', 'PROCUREMENT', 'FINANCE', 'ANALYST']).optional(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permCheck = requirePermission(req, 'MANAGE_USERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = UpdateUserSchema.parse(body);
    const currentUser = permCheck.user;

    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protection: If deactivating or changing role of the current user
    if (targetUser.id === currentUser.id && validated.isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    // Protection: Ensure at least one active ADMIN/OWNER remains
    if (
      (validated.isActive === false || (validated.role && validated.role !== 'ADMIN' && validated.role !== 'OWNER')) &&
      (targetUser.role === 'ADMIN' || targetUser.role === 'OWNER')
    ) {
      const adminCount = await db.user.count({
        where: {
          tenantId: currentUser.tenantId,
          role: { in: ['ADMIN', 'OWNER'] },
          isActive: true,
          NOT: { id: targetUser.id },
        },
      });

      if (adminCount === 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate or demote the only remaining administrator' },
          { status: 400 }
        );
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.role && { role: validated.role as UserRole }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Record audit event
    await db.auditEvent.create({
      data: {
        tenantId: currentUser.tenantId,
        userId: currentUser.id,
        action: 'UPDATE_USER',
        resourceType: 'USER',
        resourceId: updated.id,
        reason: `Updated user ${updated.email} details/status`,
      },
    }).catch(() => {});

    return NextResponse.json({ user: updated });
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
  const permCheck = requirePermission(req, 'MANAGE_USERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const { id } = await params;
    const currentUser = permCheck.user;

    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === currentUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Check if user has associated audit logs or approvals
    const approvalsCount = await db.approval.count({ where: { decidedBy: id } });
    if (approvalsCount > 0) {
      // Soft-delete / deactivate instead
      const deactivated = await db.user.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, email: true, isActive: true },
      });
      return NextResponse.json({
        success: true,
        message: 'User has historical approval records. Account has been deactivated instead of deleted.',
        user: deactivated,
      });
    }

    await db.user.delete({ where: { id } });

    await db.auditEvent.create({
      data: {
        tenantId: currentUser.tenantId,
        userId: currentUser.id,
        action: 'DELETE_USER',
        resourceType: 'USER',
        resourceId: id,
        reason: `Deleted user ${targetUser.email}`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
