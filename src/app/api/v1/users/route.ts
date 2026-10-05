import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser, requirePermission, hashPassword, UserRole } from '@/lib/auth';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'OWNER', 'MANAGER', 'PROCUREMENT', 'FINANCE', 'ANALYST']),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const users = await db.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permCheck = requirePermission(req, 'MANAGE_USERS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const body = await req.json();
    const validated = CreateUserSchema.parse(body);
    const currentUser = permCheck.user;

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const passwordHash = hashPassword(validated.password);
    const newUser = await db.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        role: validated.role as UserRole,
        phone: validated.phone,
        passwordHash,
        tenantId: currentUser.tenantId,
        isActive: true,
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
        action: 'CREATE_USER',
        resourceType: 'USER',
        resourceId: newUser.id,
        reason: `Added user ${newUser.email} with role ${newUser.role}`,
      },
    }).catch(() => {});

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues?.[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
